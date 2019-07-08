use kbdgen::{bundle::Save, cldr::Keyboard};
use snafu::{OptionExt, ResultExt, Snafu};
use snafu_cli_debug::SnafuCliDebug;
use std::{collections::BTreeMap, path::PathBuf, process::Command};
use structopt::StructOpt;

#[derive(Snafu, SnafuCliDebug)]
pub enum Error {
    #[snafu(display("Cloning CLDR repo failed"))]
    RepoCloneFailed {
        source: std::io::Error,
        backtrace: snafu::Backtrace,
    },
    #[snafu(display("Updating CLDR repo failed"))]
    RepoUpdateFailed {
        source: std::io::Error,
        backtrace: snafu::Backtrace,
    },
    #[snafu(display("No locale selected"))]
    NoLocaleSelected { backtrace: snafu::Backtrace },
    #[snafu(display("Could load kbdgen bundle: {}", source))]
    CannotLoad {
        source: kbdgen::LoadError,
        backtrace: snafu::Backtrace,
    },
    #[snafu(display("Could write kbdgen bundle: {}", source))]
    CannotSave {
        source: kbdgen::SaveError,
        backtrace: snafu::Backtrace,
    },
}

fn cldr_dir() -> PathBuf {
    directories::ProjectDirs::from("", "", "kbdgen")
        .expect("project dir")
        .cache_dir()
        .join("cldr")
}

pub fn update_cldr_repo() -> Result<(), Error> {
    let dir = cldr_dir();

    if !dir.exists() {
        log::info!("Downloading CLDR repo to `{}`…", dir.display());
        let mut command = Command::new("git")
            .args(&[
                "clone",
                "--depth",
                "1",
                "https://github.com/unicode-org/cldr",
            ])
            .arg(&dir)
            .spawn()
            .context(RepoCloneFailed)?;
        command.wait().context(RepoCloneFailed)?;
    } else {
        log::info!("Updating CLDR repo in `{}`…", dir.display());
        let mut command = Command::new("git")
            .current_dir(&dir)
            .args(&["pull"])
            .spawn()
            .context(RepoUpdateFailed)?;
        command.wait().context(RepoUpdateFailed)?;
    }

    Ok(())
}

pub fn select_base_locale() -> Option<(String, BTreeMap<String, Vec<String>>)> {
    let kbd_path = cldr_dir().join("keyboards");
    let set: BTreeMap<String, BTreeMap<String, Vec<String>>> = BTreeMap::new();
    let mut locale_map = globwalk::GlobWalkerBuilder::new(kbd_path, "*.xml")
        .build()
        .unwrap()
        .filter_map(Result::ok)
        .filter(|entry| {
            !entry
                .path()
                .file_stem()
                .unwrap()
                .to_string_lossy()
                .starts_with('_')
        })
        .fold(set, |mut acc, cur| {
            let tag = (&*cur.path().file_stem().unwrap().to_string_lossy())
                .split("-t")
                .next()
                .unwrap()
                .to_string();
            let kbd_os = (&*cur
                .path()
                .parent()
                .unwrap()
                .file_name()
                .unwrap()
                .to_string_lossy())
                .to_string();
            let entry = acc
                .entry(tag)
                .or_insert_with(BTreeMap::new)
                .entry(kbd_os)
                .or_insert_with(Vec::new);
            (*entry).push(
                cur.path()
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_string(),
            );
            acc
        });
    let mut locales = locale_map.iter().collect::<Vec<_>>();
    locales.sort();

    let options = skim::SkimOptionsBuilder::default()
        .prompt(Some("Which locale to use as base? "))
        .exact(true)
        .ansi(true)
        .build()
        .unwrap();

    let cyan = console::Style::new().cyan().dim();
    let text = locales
        .iter()
        .map(|(locale, items)| {
            let x = items.keys().map(|x| &**x).collect::<Vec<_>>();
            format!("{}   {}", locale, cyan.apply_to(x.join(", ")))
        })
        .collect::<Vec<_>>()
        .join("\n")
        .as_bytes()
        .to_owned();
    let cur = std::io::Cursor::new(text);

    let result = skim::Skim::run_with(&options, Some(Box::new(cur)))?;
    let result = result
        .selected_items
        .first()?
        .get_text()
        .split("   ")
        .next()
        .unwrap();

    Some((result.to_string(), locale_map.remove(result).unwrap()))
}

pub fn parse_path(os: &str, file: &str) -> Keyboard {
    let fn_ = cldr_dir().join("keyboards").join(os).join(file);
    // println!("{:?}", &fn_);
    let f = std::fs::File::open(fn_).unwrap();
    let kbd: Keyboard = serde_xml_rs::from_reader(f).unwrap();
    kbd
}

#[derive(Debug, StructOpt)]
struct Cli {
    #[structopt(parse(from_os_str))]
    output: PathBuf,

    #[structopt(flatten)]
    verbose: clap_verbosity_flag::Verbosity,
}

fn main() -> Result<(), Error> {
    let opts = Cli::from_args();
    let _ = opts.verbose.setup_env_logger("cldr");

    update_cldr_repo()?;
    let locale = select_base_locale().context(NoLocaleSelected)?;

    // let locale = match select_base_locale() {
    //     Some(v) => v,
    //     None => {
    //         println!("No valid locale selected; aborting.");
    //         return Ok(());
    //     }
    // };

    // let bundle = ProjectBundle::load(&opts.input).context(CannotLoad)?;
    // log::info!(
    //     "Bundle `{}` loaded, looking great to far!",
    //     opts.input.display()
    // );
    // bundle.save(&opts.output).context(CannotSave)?;
    // log::info!("New bundle written to `{}`.", opts.output.display());

    // Ok(())

    log::debug!("Selected locale: '{}'", &locale.0);
    log::debug!("Files: {:#?}", &locale.1);

    let mut modes = kbdgen::models::Modes::default();

    let xml_map = locale
        .1
        .into_iter()
        .map(|(key, mut v)| {
            v.sort();
            let last = v.last().unwrap();
            parse_path(&key, last)
        })
        .collect::<Vec<_>>();

    for keyboard in xml_map {
        match keyboard.mode_name() {
            "mobile" => modes.mobile = Some(keyboard.to_mobile_modes()),
            "mac" => modes.mac = Some(keyboard.to_desktop_modes()),
            "win" => modes.win = Some(keyboard.to_desktop_modes()),
            "chrome" => modes.chrome = Some(keyboard.to_desktop_modes()),
            _ => {}
        }
    }

    let mut layout = kbdgen::models::Layout::default();
    layout.modes = modes;

    let mut bundle = kbdgen::bundle::ProjectBundle::default();
    bundle.layouts.insert(locale.0, layout);

    // if let Some(output) = opts.output {
    let output = opts.output;
    bundle.save(&output).context(CannotSave)?;
    log::info!("New bundle written to `{}`.", output.display());
    // } else {
    //     log::info!("No output path specified, skipping");
    // }

    Ok(())
}

// fn main() {
//     use kbdgen_init::ir::Layer;
//     use kbdgen_init::*;

//     // let k = locale.1.keys().next().unwrap();
//     // let xml = parse_path(&k, &locale.1[k][0]);
//     // let layer = Layer::from(&xml.key_maps[0]);

//     // let mut map = std::collections::HashMap::new();
//     // map.insert("test", serde_yaml::Value::from(&layer));
//     // let v = serde_yaml::to_string(&map).unwrap();
//     // println!("{}", v);
// }
