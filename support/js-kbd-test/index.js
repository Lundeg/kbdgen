class Keyboard {
  static install(descriptor) {
    let contextId = -1
    const kbd = new Keyboard(descriptor)

    chrome.input.ime.onFocus.addListener((context) => {
      contextId = context.contextID
    })

    chrome.input.ime.onBlur.addListener((context) => {
      contextId = -1
    })

    chrome.input.ime.onKeyEvent.addListener((engine, keyData) => {
      if (keyData.type !== "keydown") {
        return false
      }
      
      const result = kbd.parseInput(input)

      if (result == null) {
        // Pass through the default value
        chrome.input.ime.commitText({
          contextID: contextId,
          text: keyData.key
        })
        return true
      }

      chrome.input.ime.commitText({
        contextID: contextId,
        text: result
      })

      return true
    })
  }

  static test(listener, descriptor, callback) {
    const kbd = new Keyboard(descriptor)

    listener.addEventListener("keydown", (event) => {
      console.log(event)

      const input = {
        capsLock: event.getModifierState("CapsLock"),
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        code: event.code
      }

      console.log(input)
      
      const result = kbd.parseInput(input)

      if (result != null) {
        callback(result)
      }
    })
  }

  constructor(descriptor) {
    this.descriptor = descriptor
    this.transformRef = null
  }

  *deriveFallbackLayers(layer) {
    yield layer

    if (layer === "default") {
      return
    }
  
    const hasCaps = layer.includes("caps")
    const hasShift = layer.includes("shift")

    if (hasCaps && layer !== "caps") {
      yield "caps"
    }

    if (hasShift && layer !== "shift") {
      yield "shift"
    }
  
    yield "default"
  }

  deadKey(value, layer) {
    if (this.transformRef != null) {
      return null
    }
    
    console.log("DeadKey:", value, layer)
    const deadKeyLayer = this.descriptor.deadKeys[layer]

    if (deadKeyLayer == null) {
      console.log("DeadKey: nope")
      return null
    }

    if (deadKeyLayer == null || !deadKeyLayer.includes(value)) {
      // Not a dead key
      console.log("DeadKey: no value")
      return null
    }

    console.log("DeadKey: transforming")
    this.transformRef = this.descriptor.transforms[value]
    return this.transformRef
  }

  transform(value) {
    const ref = this.transformRef

    console.log("transformRef:", ref)

    if (ref == null) {
      return null
    }

    const t = ref[value]
    console.log("t:", t, value)

    // If the current transform is not valid for the list, return the default value
    if (t == null) {
      console.log("Returning space:", ref[' '])
      return ref[' ']
    }

    return t
  }

  processInput(code, startingLayerName) {
    console.log(code)

    for (const layerName of this.deriveFallbackLayers(startingLayerName)) {
      console.log(layerName)

      let layer = this.descriptor.layers[layerName]

      console.log(layer)

      if (layer == null) {
        continue
      }

      // Check for first dead key press
      const deadKeyRef = this.deadKey(layer[code], layerName)
      if (deadKeyRef != null) {
        this.transformRef = deadKeyRef
        return null
      }

      let value

      // Space special case
      if (code === "Space") {
        value = this.descriptor.space[startingLayerName] || " "
      }

      // If nothing is valid, run away to next layer fallback
      if (value == null && layer[code] != null) {
        value = layer[code]
      }

      if (value == null) {
        continue
      }

      // If we have a current transform stack, look into it
      if (this.transformRef != null) {
        console.log("Try transform:", this.transformRef)
        
        const t = this.transform(value)

        // If it's a string, we're at the end of the line
        if (typeof t === "string") {
          this.transformRef = null
          return t
        }

        // Otherwise, buckle up for more transforms!
        this.transformRef = t
        return null
      }

      // Otherwise we just return the ordinary value
      return value
    }
  }

  parseInput({
    code,
    ctrlKey,
    shiftKey,
    capsLock,
    altKey
  }) {
    let layerName
    const o = []
    
    if (capsLock) {
      o.push("caps")
    }

    if (ctrlKey) {
      o.push("ctrl")
    }

    if (altKey) {
      o.push("alt")
    }

    if (shiftKey) {
      o.push("shift")
    }

    if (o.length > 0) {
      layerName = o.join("+")
    } else {
      layerName = "default"
    }

    return this.processInput(code, layerName)
  }
}

const eh = {
  "deadKeys": {
    "shift": [
      "`"
    ],
    "caps+shift": [
      "`"
    ],
    "alt": [
      "~",
      "¨",
      "´"
    ],
    "alt+shift": [
      "^",
      "ˇ"
    ]
  },
  "transforms": {
    "-": {
      " ": "-",
      "b": "ƀ",
      "d": "đ",
      "D": "Đ",
      "g": "ǥ",
      "G": "Ǥ",
      "h": "ħ",
      "H": "Ħ",
      "i": "ɨ",
      "I": "Ɨ",
      "l": "ł",
      "L": "Ł",
      "o": "ɵ",
      "O": "Ɵ",
      "t": "ŧ",
      "T": "Ŧ",
      "u": "ʉ",
      "z": "ƶ",
      "Z": "Ƶ"
    },
    "`": {
      " ": "`",
      "a": "à",
      "A": "À",
      "e": "è",
      "E": "È",
      "i": "ì",
      "I": "Ì",
      "n": "ǹ",
      "N": "Ǹ",
      "o": "ò",
      "O": "Ò",
      "u": "ù",
      "U": "Ù",
      "v": "ǜ",
      "V": "Ǜ",
      "w": "ẁ",
      "W": "Ẁ",
      "y": "ỳ",
      "Y": "Ỳ"
    },
    "´": {
      " ": "´",
      "a": "á",
      "A": "Á",
      "å": "ǻ",
      "Å": "Ǻ",
      "æ": "ǽ",
      "Æ": "Ǽ",
      "c": "ć",
      "C": "Ć",
      "e": "é",
      "E": "É",
      "g": "ǵ",
      "G": "Ǵ",
      "i": "í",
      "I": "Í",
      "k": "ḱ",
      "K": "Ḱ",
      "l": "ĺ",
      "L": "Ĺ",
      "m": "ḿ",
      "M": "Ḿ",
      "n": "ń",
      "N": "Ń",
      "o": "ó",
      "O": "Ó",
      "ø": "ǿ",
      "Ø": "Ǿ",
      "p": "ṕ",
      "P": "Ṕ",
      "r": "ŕ",
      "R": "Ŕ",
      "s": "ś",
      "S": "Ś",
      "u": "ú",
      "U": "Ú",
      "v": "ǘ",
      "V": "Ǘ",
      "w": "ẃ",
      "W": "Ẃ",
      "y": "ý",
      "Y": "Ý",
      "z": "ź",
      "Z": "Ź"
    },
    "˘": {
      " ": "˘",
      "a": "ă",
      "A": "Ă",
      "e": "ĕ",
      "E": "Ĕ",
      "g": "ğ",
      "G": "Ğ",
      "h": "ḫ",
      "H": "Ḫ",
      "i": "ĭ",
      "I": "Ĭ",
      "o": "ŏ",
      "O": "Ŏ",
      "u": "ŭ",
      "U": "Ŭ"
    },
    "˙": {
      " ": "˙",
      "a": "ȧ",
      "A": "Ȧ",
      "b": "ḃ",
      "B": "Ḃ",
      "c": "ċ",
      "C": "Ċ",
      "d": "ḋ",
      "D": "Ḋ",
      "e": "ė",
      "E": "Ė",
      "f": "ḟ",
      "F": "Ḟ",
      "g": "ġ",
      "G": "Ġ",
      "h": "ḣ",
      "H": "Ḣ",
      "i": "ı",
      "I": "İ",
      "m": "ṁ",
      "M": "Ṁ",
      "n": "ṅ",
      "N": "Ṅ",
      "o": "ȯ",
      "O": "Ȯ",
      "p": "ṗ",
      "P": "Ṗ",
      "r": "ṙ",
      "R": "Ṙ",
      "s": "ṡ",
      "S": "Ṡ",
      "t": "ṫ",
      "T": "Ṫ",
      "w": "ẇ",
      "W": "Ẇ",
      "x": "ẋ",
      "X": "Ẋ",
      "y": "ẏ",
      "Y": "Ẏ",
      "z": "ż",
      "Z": "Ż"
    },
    "¨": {
      " ": "¨",
      "a": "ä",
      "A": "Ä",
      "e": "ë",
      "E": "Ë",
      "h": "ḧ",
      "H": "Ḧ",
      "i": "ï",
      "I": "Ï",
      "o": "ö",
      "O": "Ö",
      "t": "ẗ",
      "T": "T\\u{308}",
      "u": "ü",
      "U": "Ü",
      "w": "ẅ",
      "W": "Ẅ",
      "x": "ẍ",
      "X": "Ẍ",
      "y": "ÿ",
      "Y": "Ÿ"
    },
    "˚": {
      " ": "˚",
      "a": "å",
      "A": "Å",
      "e": "e\\u{30A}",
      "E": "E\\u{30A}",
      "o": "o\\u{30A}",
      "O": "O\\u{30A}",
      "u": "ů",
      "U": "Ů",
      "w": "ẘ",
      "W": "W\\u{30A}",
      "y": "ẙ",
      "Y": "Y\\u{30A}"
    },
    "˝": {
      " ": "˝",
      "o": "ő",
      "O": "Ő",
      "u": "ű",
      "U": "Ű"
    },
    "¸": {
      " ": "¸",
      "c": "ç",
      "C": "Ç",
      "d": "ḑ",
      "D": "Ḑ",
      "e": "ȩ",
      "E": "Ȩ",
      "g": "ģ",
      "G": "Ģ",
      "h": "ḩ",
      "H": "Ḩ",
      "k": "ķ",
      "K": "Ķ",
      "l": "ļ",
      "L": "Ļ",
      "n": "ņ",
      "N": "Ņ",
      "r": "ŗ",
      "R": "Ŗ",
      "s": "ş",
      "S": "Ş",
      "š": "ș",
      "Š": "Ș",
      "t": "ţ",
      "T": "Ţ",
      "ŧ": "ț",
      "Ŧ": "Ț",
      "z": "z\\u{327}",
      "Z": "Z\\u{327}"
    },
    "ˆ": {
      " ": "^",
      "a": "â",
      "A": "Â",
      "c": "ĉ",
      "C": "Ĉ",
      "e": "ê",
      "E": "Ê",
      "g": "ĝ",
      "G": "Ĝ",
      "h": "ĥ",
      "H": "Ĥ",
      "i": "î",
      "I": "Î",
      "j": "ĵ",
      "J": "Ĵ",
      "m": "m\\u{302}",
      "M": "M\\u{302}",
      "n": "n\\u{302}",
      "N": "N\\u{302}",
      "o": "ô",
      "O": "Ô",
      "s": "ŝ",
      "S": "Ŝ",
      "u": "û",
      "U": "Û",
      "w": "ŵ",
      "W": "Ŵ",
      "y": "ŷ",
      "Y": "Ŷ",
      "z": "ẑ",
      "Z": "Ẑ"
    },
    "ˇ": {
      " ": "ˇ",
      "a": "ǎ",
      "A": "Ǎ",
      "c": "č",
      "C": "Č",
      "d": "ď",
      "D": "Ď",
      "e": "ě",
      "E": "Ě",
      "g": "ǧ",
      "G": "Ǧ",
      "h": "ȟ",
      "H": "Ȟ",
      "i": "ǐ",
      "I": "Ǐ",
      "j": "ǰ",
      "J": "J\\u{30C}",
      "k": "ǩ",
      "K": "Ǩ",
      "l": "ľ",
      "L": "Ľ",
      "n": "ň",
      "N": "Ň",
      "o": "ǒ",
      "O": "Ǒ",
      "r": "ř",
      "R": "Ř",
      "s": "š",
      "S": "Š",
      "t": "ť",
      "T": "Ť",
      "u": "ǔ",
      "U": "Ǔ",
      "v": "ǚ",
      "V": "Ǚ",
      "x": "ʒ\\u{30C}",
      "X": "Ʒ\\u{30C}",
      "z": "ž",
      "Z": "Ž",
      "ʒ": "ǯ",
      "Ʒ": "Ǯ"
    },
    "ƒ": {
      "0": "°",
      " ": "ƒ",
      "(": "≤",
      ")": "≥",
      "q": "•"
    },
    "№": {
      "2": "ƨ",
      "3": "ɛ",
      "5": "ƽ",
      "6": "ƅ",
      "7": "⁊",
      " ": "№",
      "a": "ə",
      "A": "Ə",
      "c": "ɔ",
      "C": "Ɔ",
      "e": "ǝ",
      "E": "Ǝ",
      "g": "ɣ",
      "G": "Ɣ",
      "h": "ƕ",
      "H": "Ƕ",
      "j": "ƞ",
      "J": "Ƞ",
      "k": "ĸ",
      "K": "K’",
      "m": "ɯ",
      "M": "Ɯ",
      "n": "ŋ",
      "N": "Ŋ",
      "q": "ƣ",
      "Q": "Ƣ",
      "r": "ʀ",
      "R": "Ʀ",
      "s": "ſ",
      "u": "ʊ",
      "U": "Ʊ",
      "v": "ʌ",
      "w": "ƿ",
      "W": "Ƿ",
      "y": "ȝ",
      "Y": "Ȝ",
      "z": "ʒ",
      "Z": "Ʒ"
    },
    "ʔ": {
      " ": "ʔ",
      "b": "ɓ",
      "B": "Ɓ",
      "c": "ƈ",
      "C": "Ƈ",
      "d": "ɗ",
      "D": "Ɗ",
      "f": "ƒ",
      "F": "Ƒ",
      "g": "ɠ",
      "G": "Ɠ",
      "h": "ɦ",
      "i": "ɩ",
      "I": "Ɩ",
      "k": "ƙ",
      "K": "Ƙ",
      "n": "ɲ",
      "N": "Ɲ",
      "p": "ƥ",
      "P": "Ƥ",
      "q": "ʠ",
      "r": "ʈ",
      "R": "Ʈ",
      "s": "ʃ",
      "S": "Ʃ",
      "t": "ƭ",
      "T": "Ƭ",
      "u": "ʋ",
      "U": "Ʋ",
      "x": "ɖ",
      "X": "Ɖ",
      "y": "ƴ",
      "Y": "Ƴ",
      "z": "ȥ",
      "Z": "Ȥ"
    },
    "ˀ": {
      " ": "ˀ",
      "a": "ả",
      "A": "Ả",
      "e": "ẻ",
      "E": "Ẻ",
      "i": "ỉ",
      "I": "Ỉ",
      "o": "ỏ",
      "O": "Ỏ",
      "u": "ủ",
      "U": "Ủ",
      "y": "ỷ",
      "Y": "Ỷ"
    },
    "ʼ": {
      " ": "ʼ",
      "o": "ơ",
      "O": "Ơ",
      "u": "ư",
      "U": "Ư"
    },
    "^": {
      " ": "^",
      "a": "â",
      "A": "Â",
      "c": "ĉ",
      "C": "Ĉ",
      "e": "ê",
      "E": "Ê",
      "g": "ĝ",
      "G": "Ĝ",
      "h": "ĥ",
      "H": "Ĥ",
      "i": "î",
      "I": "Î",
      "j": "ĵ",
      "J": "Ĵ",
      "o": "ô",
      "O": "Ô",
      "s": "ŝ",
      "S": "Ŝ",
      "u": "û",
      "U": "Û",
      "w": "ŵ",
      "W": "Ŵ",
      "y": "ŷ",
      "Y": "Ŷ"
    },
    "~": {
      " ": "~",
      "a": "ã",
      "A": "Ã",
      "i": "ĩ",
      "I": "Ĩ",
      "n": "ñ",
      "N": "Ñ",
      "o": "õ",
      "O": "Õ",
      "u": "ũ",
      "U": "Ũ"
    }
  },
  "layers": {
    "default": {
      "Backquote": "|",
      "Digit1": "1",
      "Digit2": "2",
      "Digit3": "3",
      "Digit4": "4",
      "Digit5": "5",
      "Digit6": "6",
      "Digit7": "7",
      "Digit8": "8",
      "Digit9": "9",
      "Digit0": "0",
      "Minus": "+",
      "Equal": "\\",
      "KeyQ": "á",
      "KeyW": "š",
      "KeyE": "e",
      "KeyR": "r",
      "KeyT": "t",
      "KeyY": "y",
      "KeyU": "u",
      "KeyI": "i",
      "KeyO": "o",
      "KeyP": "p",
      "BracketLeft": "å",
      "BracketRight": "ŋ",
      "KeyA": "a",
      "KeyS": "s",
      "KeyD": "d",
      "KeyF": "f",
      "KeyG": "g",
      "KeyH": "h",
      "KeyJ": "j",
      "KeyK": "k",
      "KeyL": "l",
      "Semicolon": "ø",
      "Quote": "æ",
      "Backslash": "đ",
      "IntlBackslash": "ž",
      "KeyZ": "z",
      "KeyX": "č",
      "KeyC": "c",
      "KeyV": "v",
      "KeyB": "b",
      "KeyN": "n",
      "KeyM": "m",
      "Comma": ",",
      "Period": ".",
      "Slash": "-"
    },
    "caps": {
      "Backquote": "|",
      "Digit1": "1",
      "Digit2": "2",
      "Digit3": "3",
      "Digit4": "4",
      "Digit5": "5",
      "Digit6": "6",
      "Digit7": "7",
      "Digit8": "8",
      "Digit9": "9",
      "Digit0": "0",
      "Minus": "+",
      "Equal": "\\",
      "KeyQ": "Á",
      "KeyW": "Š",
      "KeyE": "E",
      "KeyR": "R",
      "KeyT": "T",
      "KeyY": "Y",
      "KeyU": "U",
      "KeyI": "I",
      "KeyO": "O",
      "KeyP": "P",
      "BracketLeft": "Å",
      "BracketRight": "Ŋ",
      "KeyA": "A",
      "KeyS": "S",
      "KeyD": "D",
      "KeyF": "F",
      "KeyG": "G",
      "KeyH": "H",
      "KeyJ": "J",
      "KeyK": "K",
      "KeyL": "L",
      "Semicolon": "Ø",
      "Quote": "Æ",
      "Backslash": "Đ",
      "IntlBackslash": "Ž",
      "KeyZ": "Z",
      "KeyX": "Č",
      "KeyC": "C",
      "KeyV": "V",
      "KeyB": "B",
      "KeyN": "N",
      "KeyM": "M",
      "Comma": ",",
      "Period": ".",
      "Slash": "-"
    },
    "alt": {
      "Digit2": "@",
      "Digit3": "£",
      "Digit4": "$",
      "Digit5": "€",
      "Digit7": "{",
      "Digit8": "[",
      "Digit9": "]",
      "Digit0": "}",
      "Equal": "´",
      "KeyQ": "q",
      "KeyW": "w",
      "KeyE": "€",
      "KeyT": "ŧ",
      "KeyI": "ï",
      "KeyO": "õ",
      "BracketLeft": "¨",
      "BracketRight": "~",
      "KeyA": "â",
      "KeyG": "ǧ",
      "KeyH": "ǥ",
      "KeyK": "ǩ",
      "Semicolon": "ö",
      "Quote": "ä",
      "Backslash": "'",
      "IntlBackslash": "ǯ",
      "KeyZ": "ʒ",
      "KeyX": "x",
      "KeyM": "µ",
      "Comma": "<",
      "Period": ">"
    },
    "caps+shift": {
      "Backquote": "§",
      "Digit1": "!",
      "Digit2": "\"",
      "Digit3": "#",
      "Digit4": "¤",
      "Digit5": "%",
      "Digit6": "&",
      "Digit7": "/",
      "Digit8": "(",
      "Digit9": ")",
      "Digit0": "=",
      "Minus": "?",
      "Equal": "`",
      "KeyQ": "á",
      "KeyW": "š",
      "KeyE": "e",
      "KeyR": "r",
      "KeyT": "t",
      "KeyY": "y",
      "KeyU": "u",
      "KeyI": "i",
      "KeyO": "o",
      "KeyP": "p",
      "BracketLeft": "å",
      "BracketRight": "ŋ",
      "KeyA": "a",
      "KeyS": "s",
      "KeyD": "d",
      "KeyF": "f",
      "KeyG": "g",
      "KeyH": "h",
      "KeyJ": "j",
      "KeyK": "k",
      "KeyL": "l",
      "Semicolon": "ø",
      "Quote": "æ",
      "Backslash": "đ",
      "IntlBackslash": "ž",
      "KeyZ": "z",
      "KeyX": "č",
      "KeyC": "c",
      "KeyV": "v",
      "KeyB": "b",
      "KeyN": "n",
      "KeyM": "m",
      "Comma": ";",
      "Period": ":",
      "Slash": "_"
    },
    "alt+shift": {
      "KeyQ": "Q",
      "KeyW": "W",
      "KeyT": "Ŧ",
      "KeyI": "Ï",
      "KeyO": "Õ",
      "BracketLeft": "^",
      "BracketRight": "ˇ",
      "KeyA": "Â",
      "KeyG": "Ǧ",
      "KeyH": "Ǥ",
      "KeyK": "Ǩ",
      "Semicolon": "Ö",
      "Quote": "Ä",
      "Backslash": "*",
      "IntlBackslash": "Ǯ",
      "KeyZ": "Ʒ",
      "KeyX": "X"
    },
    "shift": {
      "Backquote": "§",
      "Digit1": "!",
      "Digit2": "\"",
      "Digit3": "#",
      "Digit4": "¤",
      "Digit5": "%",
      "Digit6": "&",
      "Digit7": "/",
      "Digit8": "(",
      "Digit9": ")",
      "Digit0": "=",
      "Minus": "?",
      "Equal": "`",
      "KeyQ": "Á",
      "KeyW": "Š",
      "KeyE": "E",
      "KeyR": "R",
      "KeyT": "T",
      "KeyY": "Y",
      "KeyU": "U",
      "KeyI": "I",
      "KeyO": "O",
      "KeyP": "P",
      "BracketLeft": "Å",
      "BracketRight": "Ŋ",
      "KeyA": "A",
      "KeyS": "S",
      "KeyD": "D",
      "KeyF": "F",
      "KeyG": "G",
      "KeyH": "H",
      "KeyJ": "J",
      "KeyK": "K",
      "KeyL": "L",
      "Semicolon": "Ø",
      "Quote": "Æ",
      "Backslash": "Đ",
      "IntlBackslash": "Ž",
      "KeyZ": "Z",
      "KeyX": "Č",
      "KeyC": "C",
      "KeyV": "V",
      "KeyB": "B",
      "KeyN": "N",
      "KeyM": "M",
      "Comma": ";",
      "Period": ":",
      "Slash": "_"
    }
  }
}

const descriptor = {
  layers: eh.layers,
  deadKeys: eh.deadKeys,
  transforms: eh.transforms,
  space: {
    shift: "\u00a0"
  }
}

Keyboard.test(document.querySelector("#input"), descriptor, (data) => {
  console.log(data)
  document.querySelector("#output").innerText += data
})

// document.querySelector("#input").addEventListener("keydown", (evt) => {
//   // const li = document.createElement("li")
//   // const { code, key, keyCode } = evt
//   // const v = { code, key, keyCode }
//   console.log(evt, evt.getModifierState( 'CapsLock' ))
//   // li.innerText = JSON.stringify(v)
//   // document.querySelector("#output").appendChild(li)

//   document.querySelector("#output").innerText += `,\n"${evt.code}"`

//   return false;
// })
