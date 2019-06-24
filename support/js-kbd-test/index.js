


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

  processInput(code, startingLayerName) {
    console.log(code)
    if (code === "Space") {
      return this.descriptor.space[startingLayerName] || " "
    }

    for (const layerName of this.deriveFallbackLayers(startingLayerName)) {
      console.log(layerName)
      let layer = this.descriptor.layers[layerName]

      console.log(layer)

      if (layer == null) {
        continue
      }

      if (layer[code] != null) {
        return layer[code]
      }
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

    console.log(o)

    if (o.length > 0) {
      layerName = o.join("+")
    } else {
      layerName = "default"
    }

    console.log("WAT", layerName)

    return this.processInput(code, layerName)
  }
}

const layers = {
  "alt": {
    "Backquote": "|",
    "Digit2": "@",
    "Digit3": "\u00a3",
    "Digit4": "$",
    "Digit5": "\u20ac",
    "Digit7": "{",
    "Digit8": "[",
    "Digit9": "]",
    "Digit0": "}",
    "Minus": "\\",
    "KeyQ": "q",
    "KeyW": "w",
    "KeyE": "\u20ac",
    "KeyT": "\u0167",
    "KeyI": "\u00ef",
    "KeyO": "\u00f5",
    "BracketLeft": "\u00a8",
    "BracketRight": "~",
    "KeyA": "\u00e2",
    "KeyG": "\u01e7",
    "KeyH": "\u01e5",
    "KeyK": "\u01e9",
    "Semicolon": "\u00f8",
    "Quote": "\u00e6",
    "Backslash": "'",
    "IntlBackslash": "\u01ef",
    "KeyZ": "\u0292",
    "KeyX": "x",
    "KeyM": "\u00b5",
    "Comma": "<",
    "Period": ">"
  },
  "shift": {
    "Backquote": "\u00bd",
    "Digit1": "!",
    "Digit2": "\"",
    "Digit3": "#",
    "Digit4": "\u00a4",
    "Digit5": "%",
    "Digit6": "&",
    "Digit7": "/",
    "Digit8": "(",
    "Digit9": ")",
    "Digit0": "=",
    "Minus": "?",
    "Equal": "`",
    "KeyQ": "\u00c1",
    "KeyW": "\u0160",
    "KeyE": "E",
    "KeyR": "R",
    "KeyT": "T",
    "KeyY": "Y",
    "KeyU": "U",
    "KeyI": "I",
    "KeyO": "O",
    "KeyP": "P",
    "BracketLeft": "\u00c5",
    "BracketRight": "\u014a",
    "KeyA": "A",
    "KeyS": "S",
    "KeyD": "D",
    "KeyF": "F",
    "KeyG": "G",
    "KeyH": "H",
    "KeyJ": "J",
    "KeyK": "K",
    "KeyL": "L",
    "Semicolon": "\u00d6",
    "Quote": "\u00c4",
    "Backslash": "\u0110",
    "IntlBackslash": "\u017d",
    "KeyZ": "Z",
    "KeyX": "\u010c",
    "KeyC": "C",
    "KeyV": "V",
    "KeyB": "B",
    "KeyN": "N",
    "KeyM": "M",
    "Comma": ";",
    "Period": ":",
    "Slash": "_"
  },
  "alt+shift": {
    "KeyQ": "Q",
    "KeyW": "W",
    "KeyT": "\u0166",
    "KeyI": "\u00cf",
    "KeyO": "\u00d5",
    "BracketLeft": "^",
    "BracketRight": "\u02c7",
    "KeyA": "\u00c2",
    "KeyG": "\u01e6",
    "KeyH": "\u01e4",
    "KeyK": "\u01e8",
    "Semicolon": "\u00d8",
    "Quote": "\u00c6",
    "Backslash": "*",
    "IntlBackslash": "\u01ee",
    "KeyZ": "\u01b7",
    "KeyX": "X"
  },
  "caps": {
    "Backquote": "\u00a7",
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
    "Equal": "\u00b4",
    "KeyQ": "\u00c1",
    "KeyW": "\u0160",
    "KeyE": "E",
    "KeyR": "R",
    "KeyT": "T",
    "KeyY": "Y",
    "KeyU": "U",
    "KeyI": "I",
    "KeyO": "O",
    "KeyP": "P",
    "BracketLeft": "\u00c5",
    "BracketRight": "\u014a",
    "KeyA": "A",
    "KeyS": "S",
    "KeyD": "D",
    "KeyF": "F",
    "KeyG": "G",
    "KeyH": "H",
    "KeyJ": "J",
    "KeyK": "K",
    "KeyL": "L",
    "Semicolon": "\u00d6",
    "Quote": "\u00c4",
    "Backslash": "\u0110",
    "IntlBackslash": "\u017d",
    "KeyZ": "Z",
    "KeyX": "\u010c",
    "KeyC": "C",
    "KeyV": "V",
    "KeyB": "B",
    "KeyN": "N",
    "KeyM": "M",
    "Comma": ",",
    "Period": ".",
    "Slash": "-"
  },
  "default": {
    "Backquote": "\u00a7",
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
    "Equal": "\u00b4",
    "KeyQ": "\u00e1",
    "KeyW": "\u0161",
    "KeyE": "e",
    "KeyR": "r",
    "KeyT": "t",
    "KeyY": "y",
    "KeyU": "u",
    "KeyI": "i",
    "KeyO": "o",
    "KeyP": "p",
    "BracketLeft": "\u00e5",
    "BracketRight": "\u014b",
    "KeyA": "a",
    "KeyS": "s",
    "KeyD": "d",
    "KeyF": "f",
    "KeyG": "g",
    "KeyH": "h",
    "KeyJ": "j",
    "KeyK": "k",
    "KeyL": "l",
    "Semicolon": "\u00f6",
    "Quote": "\u00e4",
    "Backslash": "\u0111",
    "IntlBackslash": "\u017e",
    "KeyZ": "z",
    "KeyX": "\u010d",
    "KeyC": "c",
    "KeyV": "v",
    "KeyB": "b",
    "KeyN": "n",
    "KeyM": "m",
    "Comma": ",",
    "Period": ".",
    "Slash": "-"
  },
  "ctrl": {},
  "caps+shift": {
    "Backquote": "\u00bd",
    "Digit1": "!",
    "Digit2": "\"",
    "Digit3": "#",
    "Digit4": "\u00a4",
    "Digit5": "%",
    "Digit6": "&",
    "Digit7": "/",
    "Digit8": "(",
    "Digit9": ")",
    "Digit0": "=",
    "Minus": "?",
    "Equal": "`",
    "KeyQ": "\u00e1",
    "KeyW": "\u0161",
    "KeyE": "e",
    "KeyR": "r",
    "KeyT": "t",
    "KeyY": "y",
    "KeyU": "u",
    "KeyI": "i",
    "KeyO": "o",
    "KeyP": "p",
    "BracketLeft": "\u00e5",
    "BracketRight": "\u014b",
    "KeyA": "a",
    "KeyS": "s",
    "KeyD": "d",
    "KeyF": "f",
    "KeyG": "g",
    "KeyH": "h",
    "KeyJ": "j",
    "KeyK": "k",
    "KeyL": "l",
    "Semicolon": "\u00f6",
    "Quote": "\u00e4",
    "Backslash": "\u0111",
    "IntlBackslash": "\u017e",
    "KeyZ": "z",
    "KeyX": "\u010d",
    "KeyC": "c",
    "KeyV": "v",
    "KeyB": "b",
    "KeyN": "n",
    "KeyM": "m",
    "Comma": ";",
    "Period": ":",
    "Slash": "_"
  }
}

const descriptor = {
  layers,
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
