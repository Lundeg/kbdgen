from collections import defaultdict, OrderedDict
import itertools

from ..base import get_logger
from .base import PhysicalGenerator, run_process, DesktopLayoutView, bind_iso_keys

logger = get_logger(__file__)

KEY_MAP = bind_iso_keys((
    # Row E
    "Backquote",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",

    # Row D
    "KeyQ",
    "KeyW",
    "KeyE",
    "KeyR",
    "KeyT",
    "KeyY",
    "KeyU",
    "KeyI",
    "KeyO",
    "KeyP",
    "BracketLeft",
    "BracketRight",

    # Row C
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyJ",
    "KeyK",
    "KeyL",
    "Semicolon",
    "Quote",
    "Backslash",

    # Row B
    "IntlBackslash",
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyN",
    "KeyM",
    "Comma",
    "Period",
    "Slash"
))

import json

def replace_iso_keys(obj):
    o = {}
    for k in obj.keys():
        if obj[k] is None:
            continue
        o[KEY_MAP[k]] = obj[k]
    for k in o.keys():
        if len(o[k]) == 0:
            del o[k]
    return o

class ChromeOSGenerator(PhysicalGenerator):
    def generate(self, base="."):
        if not self.sanity_check():
            return

        print(KEY_MAP)

        layouts = {}
        for name, layout in self._bundle.layouts.items():
            print("==== %s ====" % name)
            layout_view = DesktopLayoutView(layout, "win")
            modes = {}
            for (name, mode) in layout_view.modes().items():
                modes[name] = replace_iso_keys(mode)
            # Create list to ignore false negatives for different targets
            # dead_key_lists = [v for v in [k.values() for k in layout.dead_keys.values()]]
            # all_dead_keys = set(itertools.chain.from_iterable([k for sublist in dead_key_lists for k in sublist]))
            print(json.dumps({
                "deadKeys": layout_view.dead_keys(),
                "transforms": layout.transforms,
                "layers": modes
            }, indent=2, ensure_ascii=False))
            # print(json.dumps(layout.encode(), indent=2, ensure_ascii=False))
            # break

        # print(json.dumps({"layouts": layouts}, indent=2, ensure_ascii=False))

        if self.is_release:
            raise NotImplementedError()


