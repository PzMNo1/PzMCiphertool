// 3_Enigma.js

const Enigmameta = {
  name: 'enigma',
  title: 'Enigma machine',
  category: 'Ciphers',
  type: 'encoder'
}

const Enigmaalphabet = 'abcdefghijklmnopqrstuvwxyz'
const Enigmamodels = [
  {
    name: 'I',
    label: 'Enigma I',
    description: 'German Army & Air Force',
    characterGroupSize: 5,
    plugboard: true,
    entryRotor: 'ETW-ABCDEF',
    reflectorRotors: ['UKW-A', 'UKW-B', 'UKW-C'],
    reflectorThumbwheel: false,
    slots: [
      { rotors: ['I', 'II', 'III', 'IV', 'V'] },
      { rotors: ['I', 'II', 'III', 'IV', 'V'] },
      { rotors: ['I', 'II', 'III', 'IV', 'V'] }
    ]
  },
  {
    name: 'N',
    label: 'Enigma I "Norenigma"',
    description: 'Norwegian Police Security Service',
    characterGroupSize: 5,
    plugboard: true,
    entryRotor: 'ETW-ABCDEF',
    reflectorRotors: ['UKW-N'],
    reflectorThumbwheel: false,
    slots: [
      { rotors: ['I-N', 'II-N', 'III-N', 'IV-N', 'V-N'] },
      { rotors: ['I-N', 'II-N', 'III-N', 'IV-N', 'V-N'] },
      { rotors: ['I-N', 'II-N', 'III-N', 'IV-N', 'V-N'] }
    ]
  },
  {
    name: 'S',
    label: 'Enigma I "Sondermaschine"',
    description: 'German Intelligence',
    characterGroupSize: 5,
    plugboard: true,
    entryRotor: 'ETW-ABCDEF',
    reflectorRotors: ['UKW-S'],
    reflectorThumbwheel: false,
    slots: [
      { rotors: ['I-S', 'II-S', 'III-S'] },
      { rotors: ['I-S', 'II-S', 'III-S'] },
      { rotors: ['I-S', 'II-S', 'III-S'] }
    ]
  },
  {
    name: 'M3',
    label: 'Enigma M3',
    description: 'German Army & Navy',
    characterGroupSize: 5,
    plugboard: true,
    entryRotor: 'ETW-ABCDEF',
    reflectorRotors: ['UKW-B', 'UKW-C'],
    reflectorThumbwheel: false,
    slots: [
      { rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] },
      { rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] },
      { rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] }
    ]
  },
  {
    name: 'M4',
    label: 'Enigma M4 "Shark"',
    description: 'German Submarines',
    characterGroupSize: 4,
    plugboard: true,
    entryRotor: 'ETW-ABCDEF',
    reflectorRotors: ['UKW-B-thin', 'UKW-C-thin'],
    reflectorThumbwheel: false,
    slots: [
      { rotors: ['beta', 'gamma'], rotating: false },
      { rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] },
      { rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] },
      { rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] }
    ]
  },
  {
    name: 'D',
    label: 'Enigma D / K',
    description: 'Commercial Enigma',
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-QWERTZ',
    reflectorRotors: ['UKW-COM'],
    reflectorThumbwheel: true,
    slots: [
      { rotors: ['I-D', 'II-D', 'III-D'] },
      { rotors: ['I-D', 'II-D', 'III-D'] },
      { rotors: ['I-D', 'II-D', 'III-D'] }
    ]
  },
  {
    name: 'T',
    label: 'Enigma T "Tirpitz"',
    description: 'Japanese Army',
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-T',
    reflectorRotors: ['UKW-T'],
    reflectorThumbwheel: true,
    slots: [
      {
        rotors: [
          'I-T', 'II-T', 'III-T', 'IV-T',
          'V-T', 'VI-T', 'VII-T', 'VIII-T'
        ]
      },
      {
        rotors: [
          'I-T', 'II-T', 'III-T', 'IV-T',
          'V-T', 'VI-T', 'VII-T', 'VIII-T'
        ]
      },
      {
        rotors: [
          'I-T', 'II-T', 'III-T', 'IV-T',
          'V-T', 'VI-T', 'VII-T', 'VIII-T'
        ]
      }
    ]
  },
  {
    name: 'KS',
    label: 'Swiss-K',
    description: 'Swiss Army & Air Force',
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-QWERTZ',
    reflectorRotors: ['UKW-COM'],
    reflectorThumbwheel: true,
    slots: [
      { rotors: ['I-KS', 'II-KS', 'III-KS'] },
      { rotors: ['I-KS', 'II-KS', 'III-KS'] },
      { rotors: ['I-KS', 'II-KS', 'III-KS'] }
    ]
  },
  {
    name: 'KR',
    label: 'Railway Enigma "Rocket I"',
    description: 'German Railway',
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-QWERTZ',
    reflectorRotors: ['UKW-KR'],
    reflectorThumbwheel: true,
    slots: [
      { rotors: ['I-KR', 'II-KR', 'III-KR'] },
      { rotors: ['I-KR', 'II-KR', 'III-KR'] },
      { rotors: ['I-KR', 'II-KR', 'III-KR'] }
    ]
  },
  {
    name: 'Z',
    label: 'Zählwerk Enigma A-865',
    description: null,
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-QWERTZ',
    reflectorRotors: ['UKW-COM'],
    reflectorThumbwheel: true,
    reflectorRotating: true,
    turnoverMechanism: 'cog',
    slots: [
      { rotors: ['I-Z', 'II-Z', 'III-Z'] },
      { rotors: ['I-Z', 'II-Z', 'III-Z'] },
      { rotors: ['I-Z', 'II-Z', 'III-Z'] }
    ]
  },
  {
    name: 'G111',
    label: 'Abwehr Enigma G-111',
    description: null,
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-QWERTZ',
    reflectorRotors: ['UKW-COM'],
    reflectorThumbwheel: true,
    reflectorRotating: true,
    turnoverMechanism: 'cog',
    slots: [
      { rotors: ['I-G111', 'II-G111', 'V-G111'] },
      { rotors: ['I-G111', 'II-G111', 'V-G111'] },
      { rotors: ['I-G111', 'II-G111', 'V-G111'] }
    ]
  },
  {
    name: 'G312',
    label: 'Abwehr Enigma G-312',
    description: 'German Seret Service',
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-QWERTZ',
    reflectorRotors: ['UKW-G312'],
    reflectorThumbwheel: true,
    reflectorRotating: true,
    turnoverMechanism: 'cog',
    slots: [
      { rotors: ['I-G312', 'II-G312', 'III-G312'] },
      { rotors: ['I-G312', 'II-G312', 'III-G312'] },
      { rotors: ['I-G312', 'II-G312', 'III-G312'] }
    ]
  },
  {
    name: 'G260',
    label: 'Abwehr Enigma G-260',
    description: 'German Seret Service in Argentina',
    characterGroupSize: 5,
    plugboard: false,
    entryRotor: 'ETW-QWERTZ',
    reflectorRotors: ['UKW-COM'],
    reflectorThumbwheel: true,
    reflectorRotating: true,
    turnoverMechanism: 'cog',
    slots: [
      { rotors: ['I-G260', 'II-G260', 'III-G260'] },
      { rotors: ['I-G260', 'II-G260', 'III-G260'] },
      { rotors: ['I-G260', 'II-G260', 'III-G260'] }
    ]
  }
]

const rotorTableColumns = ['name', 'label', 'wiring', 'turnovers']
const rotorTable = [
  
  'ETW-ABCDEF', 'Alphabet',   'abcdefghijklmnopqrstuvwxyz', '',

  'ETW-QWERTZ', 'Keyboard',   'jwulcmnohpqzyxiradkegvbtsf', '',

  // Enigma I, M3, M4
  'I',          'I',          'ekmflgdqvzntowyhxuspaibrcj', 'q',
  'II',         'II',         'ajdksiruxblhwtmcqgznpyfvoe', 'e',
  'III',        'III',        'bdfhjlcprtxvznyeiwgakmusqo', 'v',
  'IV',         'IV',         'esovpzjayquirhxlnftgkdcmwb', 'j',
  'V',          'V',          'vzbrgityupsdnhlxawmjqofeck', 'z',
  'VI',         'VI',         'jpgvoumfyqbenhzrdkasxlictw', 'zm',
  'VII',        'VII',        'nzjhgrcxmyswboufaivlpekqdt', 'zm',
  'VIII',       'VIII',       'fkqhtlxocbjspdzramewniuygv', 'zm',
  'beta',       'Beta',       'leyjvcnixwpbqmdrtakzgfuhos', '',
  'gamma',      'Gamma',      'fsokanuerhmbtiycwlqpzxvgjd', '',
  'UKW-A',      'UKW A',      'ejmzalyxvbwfcrquontspikhgd', '',
  'UKW-B',      'UKW B',      'yruhqsldpxngokmiebfzcwvjat', '',
  'UKW-C',      'UKW C',      'fvpjiaoyedrzxwgctkuqsbnmhl', '',
  'UKW-B-thin', 'UKW B thin', 'enkqauywjicopblmdxzvfthrgs', '',
  'UKW-C-thin', 'UKW C thin', 'rdobjntkvehmlfcwzaxgyipsuq', '',

  // Enigma I "Norenigma"
  'I-N',        'I',          'wtokasuyvrbxjhqcpzefmdinlg', 'q',
  'II-N',       'II',         'gjlpubswemctqvhxaofzdrkyni', 'e',
  'III-N',      'III',        'jwfmhnbpusdytixvzgrqlaoekc', 'v',
  'IV-N',       'IV',         'fgzjmvxepbwshqtliudykcnrao', 'j',
  'V-N',        'V',          'hejxqotzbvfdascilwpgynmurk', 'z',
  'UKW-N',      'UKW',        'mowjypuxndsraibfvlkzgqchet', '',

  // Enigma I "Sondermaschine"
  'I-S',        'I',          'veosirzujdqckgwypnxaflthmb', 'q',
  'II-S',       'II',         'uemoatqlshpkcyfwjzbgvxidnr', 'e',
  'III-S',      'III',        'tzhxmbsipnurjfdkeqvcwglaoy', 'v',
  'UKW-S',      'UKW',        'ciagsndrbytpzfulvhekoqxwjm', '',

  // Enigma D
  'I-D',        'I',          'lpgszmhaeoqkvxrfybutnicjdw', 'y',
  'II-D',       'II',         'slvgbtfxjqohewirzyamkpcndu', 'e',
  'III-D',      'III',        'cjgdpshkturawzxfmynqobvlie', 'n',
  'UKW-COM',    'UKW',        'imetcgfraysqbzxwlhkdvupojn', '',

  // Enigma T "Tirpitz"
  'ETW-T',      'ETW',        'ilxrztkgjyamwvdufcpqeonshb', '',
  'I-T',        'I',          'kptyuelocvgrfqdanjmbswhzxi', 'wzekq',
  'II-T',       'II',         'uphzlweqmtdjxcaksoigvbyfnr', 'wzflr',
  'III-T',      'III',        'qudlyrfekonvzaxwhmgpjbsict', 'wzekq',
  'IV-T',       'IV',         'ciwtbkxnrespflydagvhquojzm', 'wzflr',
  'V-T',        'V',          'uaxgisnjbverdylfzwtpckohmq', 'ycfkr',
  'VI-T',       'VI',         'xfuzgalvhcnysewqtdmrbkpioj', 'xeimq',
  'VII-T',      'VII',        'bjvftxplnayozikwgdqeruchsm', 'ycfkr',
  'VIII-T',     'VIII',       'ymtpnzhwkodajxeluqvgcbisfr', 'xeimq',
  'UKW-T',      'UKW',        'gekpbtaumocniljdxzyfhwvqsr', '',

  // Swiss-K
  'I-KS',       'I',          'pezuohxscvfmtbglrinqjwaydk', 'y',
  'II-KS',      'II',         'zouesydkfwpciqxhmvblgnjrat', 'e',
  'III-KS',     'III',        'ehrvxgaobqusimzflynwktpdjc', 'n',

  // Railway Enigma "Rocket I"
  'I-KR',       'I',          'jgdqoxuscamifrvtpnewkblzyh', 'n',
  'II-KR',      'II',         'ntzpsfbokmwrcjdivlaeyuxhgq', 'e',
  'III-KR',     'III',        'jviubhtcdyakeqzposgxnrmwfl', 'y',
  'UKW-KR',     'UKW',        'qyhognecvpuztfdjaxwmkisrbl', '',

  // Enigma Zählwerk A-865
  'I-Z',        'I',          'lpgszmhaeoqkvxrfybutnicjdw', 'suvwzabcefgiklopq',
  'II-Z',       'II',         'slvgbtfxjqohewirzyamkpcndu', 'stvyzacdfghkmnq',
  'III-Z',      'III',        'cjgdpshkturawzxfmynqobvlie', 'uwxaefhkmnr',

  // Enigma Zählwerk G-111
  'I-G111',     'I',          'wlrhbqundkjczsexotmagyfpvi', 'suvwzabcefgiklopq',
  'II-G111',    'II',         'tfjqazwmhlcuixrdygoevbnskp', 'stvyzacdfghkmnq',
  'V-G111',     'V',          'qtpixwvdfrmusljohcanezkybg', 'swzfhmq',

  // Abwehr Enigma G-312
  'I-G312',     'I',          'dmtwsilruyqnkfejcazbpgxohv', 'suvwzabcefgiklopq',
  'II-G312',    'II',         'hqzgpjtmoblncifdyawveusrkx', 'stvyzacdfghkmnq',
  'III-G312',   'III',        'uqntlszfmrehdpxkibvygjcwoa', 'uwxaefhkmnr',
  'UKW-G312',   'UKW',        'rulqmzjsygocetkwdahnbxpvif', '',

  // Abwehr Enigma G-260
  'I-G260',     'I',          'rcspblkqaumhwytifzvgojnexd', 'suvwzabcefgiklopq',
  'II-G260',    'II',         'wcmibvpjxarosgndlzkeyhufqt', 'stvyzacdfghkmnq',
  'III-G260',   'III',        'fvdhzelsqmaxokyiwpgcbujtnr', 'uwxaefhkmnr'

]


let modelMap = null
let rotorMap = null

class EnigmaEncoder {
  static getMeta () {
    return Enigmameta
  }

  constructor () {
    this.settings = new Map()
    const model = EnigmaEncoder.getModel('M3')
    const rotors = EnigmaEncoder.getRotors(model.slots[0].rotors)
    const rotorNames = rotors.map(rotor => rotor.name)
    const rotorLabels = rotors.map(rotor => rotor.label)
    const reflectorRotors = EnigmaEncoder.getRotors(model.reflectorRotors)

    this.addSetting({
      name: 'model',
      type: 'enum',
      value: model.name,
      elements: Enigmamodels.map(model => model.name),
      labels: Enigmamodels.map(model => model.label),
      descriptions: Enigmamodels.map(model => model.description),
      randomizable: false
    })

    this.addSetting({
      name: 'reflector',
      type: 'enum',
      value: reflectorRotors[0].name,
      elements: reflectorRotors.map(rotor => rotor.name),
      labels: reflectorRotors.map(rotor => rotor.label),
      width: 4
    })

    this.addSetting({
      name: 'positionReflector',
      label: 'Position',
      type: 'number',
      value: 1,
      integer: true,
      min: 1,
      max: 27,
      describeValue: this.describePositionValue.bind(this),
      width: 4
    })

    this.addSetting({
      name: 'ringReflector',
      label: 'Ring',
      type: 'number',
      value: 1,
      integer: true,
      min: 1,
      max: 27,
      describeValue: this.describePositionValue.bind(this),
      width: 4
    })

    for (let i = 0; i < EnigmaEncoder.getMaxSlotCount(); i++) {
      this.addSetting({
        name: `rotor${i + 1}`,
        label: `Rotor ${i + 1}`,
        type: 'enum',
        value: rotorNames[0],
        elements: rotorNames,
        labels: rotorLabels,
        randomizable: false,
        width: 4
      })

      this.addSetting({
        name: `position${i + 1}`,
        label: 'Position',
        type: 'number',
        value: 1,
        integer: true,
        min: 1,
        max: 27,
        describeValue: this.describePositionValue.bind(this),
        width: 4
      })

      this.addSetting({
        name: `ring${i + 1}`,
        label: 'Ring',
        type: 'number',
        value: 1,
        integer: true,
        min: 1,
        max: 27,
        describeValue: this.describePositionValue.bind(this),
        width: 4
      })
    }

    this.addSetting({
      name: 'plugboard',
      type: 'text',
      value: '',
      caseSensitivity: false,
      validateValue: this.validatePlugboardValue.bind(this),
      filterValue: value => value.getString().trim().toLowerCase(),
      randomizeValue: this.randomizePlugboardValue.bind(this)
    })

    this.addSetting({
      name: 'includeForeignChars',
      type: 'boolean',
      label: 'Foreign Chars',
      value: false,
      trueLabel: 'Include',
      falseLabel: 'Ignore',
      randomizable: false
    })

    this.applyModel(model.name)
  }

  settingValueDidChange (setting, value) {
    if (setting.getName() === 'model') {
      this.applyModel(value)
    }
  }

  applyModel (modelName) {
    const model = EnigmaEncoder.getModel(modelName)
    const maxSlotCount = EnigmaEncoder.getMaxSlotCount()
    for (let i = 0; i < maxSlotCount; i++) {
      const slot = i < model.slots.length ? model.slots[i] : null
      const slotVisible = slot !== null
      if (slotVisible) {
        const rotors = EnigmaEncoder.getRotors(slot.rotors)
        const rotorNames = rotors.map(rotor => rotor.name)
        const currentRotor = this.getSettingValue(`rotor${i + 1}`)
        if (rotorNames.indexOf(currentRotor) === -1) {
          this.setSettingValue(`rotor${i + 1}`, rotors[0].name)
        }
      }
    }

    const reflectorRotors = EnigmaEncoder.getRotors(model.reflectorRotors)
    const reflectorNames = reflectorRotors.map(rotor => rotor.name)
    const currentReflector = this.getSettingValue('reflector')
    if (reflectorNames.indexOf(currentReflector) === -1) {
      this.setSettingValue('reflector', reflectorRotors[0].name)
    }

    reflectorRotors.forEach(rotor => {
      const rotorNames = reflectorRotors.map(rotor => rotor.name)
      const currentRotor = this.getSettingValue('reflector')
      if (rotorNames.indexOf(currentRotor) === -1) {
        this.setSettingValue('reflector', rotor.name)
      }
    })

    this.getSetting('positionReflector').setVisible(model.reflectorThumbwheel)
    this.getSetting('ringReflector').setVisible(model.reflectorThumbwheel)
    this.getSetting('plugboard').setVisible(model.plugboard)
  }

  performTranslate (content, isEncode) {
    const includeForeignChars = this.getSettingValue('includeForeignChars')
    const model = EnigmaEncoder.getModel(this.getSettingValue('model'))
    let i = 0
    const slots = model.slots
    const slotCount = slots.length
    const slotRotating = slots.map(slot => slot.rotating !== false)
    const rotors = []
    const positions = []
    const rings = []
    const stepRotors = new Array(slotCount)

    for (i = 0; i < slotCount; i++) {
      const name = this.getSettingValue(`rotor${i + 1}`)
      rotors.push(EnigmaEncoder.getRotor(name))
      positions.push(this.getSettingValue(`position${i + 1}`) - 1)
      rings.push(this.getSettingValue(`ring${i + 1}`) - 1)
    }

    const entryRotor = EnigmaEncoder.getRotor(model.entryRotor)
    const entryPosition = 0
    const entryRing = 0
    const reflectorRotating = model.reflectorRotating === true
    const reflectorRotor =
      EnigmaEncoder.getRotor(this.getSettingValue('reflector'))
    let reflectorPosition = model.reflectorThumbwheel
      ? this.getSettingValue('positionReflector') - 1
      : 0
    const reflectorRing = model.reflectorThumbwheel
      ? this.getSettingValue('ringReflector') - 1
      : 0
    let stepReflector

    let plugboard = null
    if (model.plugboard) {
      const plugboardSetting = this.getSettingValue('plugboard')
      plugboard = this.wiringFromPlugboardValue(plugboardSetting.toString())
    }
    const map = EnigmaEncoder.rotorMapChar
    let encodedCodePoints = content.getCodePoints().map((codePoint, index) => {
      let char = null

      if (codePoint >= 65 && codePoint <= 90) {
        char = codePoint - 65
      } else if (codePoint >= 97 && codePoint <= 122) {
        char = codePoint - 97
      } else {
        return includeForeignChars ? codePoint : false
      }

      stepRotors.fill(false)
      stepReflector = false

      if (model.turnoverMechanism === 'cog') {
        let turnover = true
        i = slotCount
        while (turnover && --i >= 0) {
          if (slotRotating[i]) {
            turnover = EnigmaEncoder.rotorAtTurnover(rotors[i], positions[i])
            stepRotors[i] = true
          } else {
            turnover = false
          }
        }

        stepReflector = reflectorRotating && turnover
      } else {for (i = 0; i < slotCount; i++) {
          if (
            slotRotating[i] &&
            ((reflectorRotating && i === 0) || slotRotating[i - 1]) &&
            EnigmaEncoder.rotorAtTurnover(rotors[i], positions[i])
          ) {
            stepRotors[i] = true
            if (i > 0) {stepRotors[i - 1] = true} else {stepReflector = true
            }
          }
        }

        stepRotors[slotCount - 1] = slotRotating[slotCount - 1]
      }

      for (i = 0; i < slotCount; i++) {
        if (stepRotors[i]) {
          positions[i] = (positions[i] + 1) % 26
        }
      }

      if (stepReflector) {
        reflectorPosition = (reflectorPosition + 1) % 26
      }

      if (plugboard !== null) {
        char = map(char, plugboard, 0, 0, false)
      }

      char = map(char, entryRotor, entryPosition, entryRing, false)

      for (i = rotors.length - 1; i >= 0; i--) {
        char = map(char, rotors[i], positions[i], rings[i], false)
      }

      char = map(char, reflectorRotor, reflectorPosition, reflectorRing, false)

      for (i = 0; i < rotors.length; i++) {
        char = map(char, rotors[i], positions[i], rings[i], true)
      }

      char = map(char, entryRotor, entryPosition, entryRing, true)

      if (plugboard !== null) {
        char = map(char, plugboard, 0, 0, true)
      }

      return char + 97
    })

    if (!includeForeignChars) {
      const codePoints = []
      encodedCodePoints.forEach(codePoint => {
        if (codePoint === false) {
          return
        }
        if ((codePoints.length + 1) % (model.characterGroupSize + 1) === 0) {
          codePoints.push(32)
        }
        codePoints.push(codePoint)
      })
      encodedCodePoints = codePoints
    }

    return encodedCodePoints
  }


  static rotorAtTurnover (rotor, position) {
    if (!rotor.turnovers) {
      return false
    }
    const positionChar = String.fromCharCode(97 + MathUtil.mod(position, 26))
    return rotor.turnovers.indexOf(positionChar) !== -1
  }


  static rotorMapChar (
    charIndex, rotorOrWiring, position, ringSetting, inverted
  ) {
    const wiring = typeof rotorOrWiring === 'string'
      ? rotorOrWiring
      : rotorOrWiring.wiring
    position = MathUtil.mod(position - ringSetting, 26)
    charIndex = MathUtil.mod(charIndex + position, 26)
    charIndex = !inverted
      ? wiring.charCodeAt(charIndex) - 97
      : wiring.indexOf(String.fromCharCode(97 + charIndex))
    charIndex = MathUtil.mod(charIndex - position, 26)
    return charIndex
  }

  describePositionValue (value, setting) {
    return Enigmaalphabet[value - 1].toUpperCase()
  }

  validatePlugboardValue (rawValue, setting) {
    const plugboard = rawValue.getString()

    if (plugboard === '') {
      return true
    }

    if (plugboard.match(/^([a-z]{2}\s)*([a-z]{2})$/) === null) {
      return {
        key: 'enigmaPlugboardInvalidFormat',
        message:
          'Invalid plugboard format: pairs of letters to be swapped ' +
          'expected (e.g. \'ab cd ef\')'
      }
    }

    if (!ArrayUtil.isUnique(plugboard.replace(/\s/g, '').split(''))) {
      return {
        key: 'enigmaPlugboardPairsNotUnique',
        message: 'Pairs of letters to be swapped need to be unique'
      }
    }

    return true
  }

  wiringFromPlugboardValue (plugboard) {
    const wiring = Enigmaalphabet.split('')
    plugboard.split(' ').forEach(pair => {
      wiring[pair.charCodeAt(0) - 97] = pair[1]
      wiring[pair.charCodeAt(1) - 97] = pair[0]
    })
    return wiring.join('')
  }


  isRandomizable () {
    return true
  }

  randomize () {
    const model = EnigmaEncoder.getModel(this.getSettingValue('model'))
    let i, index, rotor

    let rotors = model.reflectorRotors
    for (i = 0; i < model.slots.length; i++) {
      rotors = rotors.concat(model.slots[i].rotors)
    }

    rotors = ArrayUtil.unique(rotors)
    rotors = ArrayUtil.shuffle(rotors)

    index = rotors.findIndex(rotor =>
      model.reflectorRotors.indexOf(rotor) !== -1)
    if (index !== -1) {
      rotor = rotors.splice(index, 1)[0]
      this.setSettingValue('reflector', rotor)
    }

    for (i = 0; i < model.slots.length; i++) {
      index = rotors.findIndex(rotor =>
        model.slots[i].rotors.indexOf(rotor) !== -1)
      if (index !== -1) {
        rotor = rotors.splice(index, 1)[0]
        this.setSettingValue(`rotor${i + 1}`, rotor)
      }
    }

    super.randomize()
    return this
  }


  randomizePlugboardValue (random, setting) {
    const shuffled =
      ArrayUtil.shuffle(Enigmaalphabet.split(''), random)
        .join('').substr(0, 20)
    return StringUtil.chunk(shuffled, 2).join(' ')
  }


  static getModel (name) {
    if (modelMap === null) {
      modelMap = {}
      Enigmamodels.forEach(model => {
        modelMap[model.name] = model
      })
    }
    return modelMap[name] || null
  }


  static getMaxSlotCount () {
    return Enigmamodels.reduce((max, model) => Math.max(max, model.slots.length), 0)
  }

  static getRotor (name) {
    if (rotorMap === null) {
      rotorMap = {}
      let i, j, rotor
      for (i = 0; i < rotorTable.length; i += rotorTableColumns.length) {
        rotor = {}
        for (j = 0; j < rotorTableColumns.length; j++) {
          rotor[rotorTableColumns[j]] = rotorTable[i + j]
        }
        rotorMap[rotor.name] = rotor
      }
    }
    return rotorMap[name] || null
  }

  static getRotors (names) {
    return names.map(name => EnigmaEncoder.getRotor(name))
  }

  encode(content) {
    if (typeof content === 'string') {
      content = new StringContent(content)
    }
    const encodedCodePoints = this.performTranslate(content, true)
    return new StringContent(String.fromCodePoint(...encodedCodePoints))
  }
  
  decode(content) {
    if (typeof content === 'string') {
      content = new StringContent(content)
    }
    // 恩尼格玛是对称的，编码和解码逻辑相同
    const decodedCodePoints = this.performTranslate(content, false)
    return new StringContent(String.fromCodePoint(...decodedCodePoints))
  }
  
  getSettingValue(name) {
    const setting = this.settings.get(name)
    return setting !== undefined ? setting : null
  }
  
  setSettingValue(name, value) {
    this.settings.set(name, value)
    return this
  }
  
  addSetting(setting) {
    this.settings.set(setting.name, setting.value)
    return this
  }

  getSetting(name) {
    return {
      getName: () => name,
      getValue: () => this.settings.get(name),
      validateValue: () => true,
      setValue: (value) => {
        this.settings.set(name, value);
        return this;
      },
      setVisible: () => {},
      setElements: () => {},
      setWidth: () => {}
    };
  }
}


function initEnigmaUI() {
  const enigmaModelSelect = document.getElementById('enigmaModel');
  if (!enigmaModelSelect) {
    setTimeout(initEnigmaUI, 200);
    return;
  }
  
  enigmaModelSelect.innerHTML = '';
  Enigmamodels.forEach(model => {
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = `${model.label}${model.description ? ' - ' + model.description : ''}`;
    enigmaModelSelect.appendChild(option);
  });
  
  updateEnigmaLayout();
  enigmaModelSelect.addEventListener('change', updateEnigmaLayout);
  const mainInput = document.getElementById('mainInput');
  if (mainInput && !mainInput._enigmaListenerAdded) {
    mainInput.addEventListener('input', processEnigma);
    mainInput._enigmaListenerAdded = true;
  }
  

  const plugboard = document.getElementById('Plugboard');
  if (plugboard && !plugboard._enigmaListenerAdded) {
    plugboard.addEventListener('input', processEnigma);
    plugboard._enigmaListenerAdded = true;
  }
}

window.addEventListener('load', initEnigmaUI);
function updateEnigmaLayout() {
  const modelSelect = document.getElementById('enigmaModel')
  const rotorSettings = document.getElementById('rotorSettings')
  const plugboardInput = document.getElementById('Plugboard')
  const selectedModel = EnigmaEncoder.getModel(modelSelect.value)
  if (!selectedModel) return
  rotorSettings.innerHTML = ''
  const reflectorRotors = EnigmaEncoder.getRotors(selectedModel.reflectorRotors)
  const reflectorRow = document.createElement('div')
  reflectorRow.className = 'grid-full2'
  if (reflectorRotors.length > 1 || selectedModel.reflectorThumbwheel) {
    const reflectorSelect = document.createElement('select')
    reflectorSelect.id = 'enigmaReflector'
    reflectorSelect.addEventListener('change', processEnigma)
    
    reflectorRotors.forEach(rotor => {
      const option = document.createElement('option')
      option.value = rotor.name
      option.textContent = rotor.label
      reflectorSelect.appendChild(option)
    })
    
    const reflectorLabel = document.createElement('span')
    reflectorLabel.textContent = ''
    
    reflectorRow.appendChild(reflectorLabel)
    reflectorRow.appendChild(reflectorSelect)
  }
  
  // 反射器位置和环设置
  if (selectedModel.reflectorThumbwheel) {
    const positionInput = document.createElement('input')
    positionInput.type = 'number'
    positionInput.id = 'reflectorPosition'
    positionInput.min = 1
    positionInput.max = 26
    positionInput.value = 1
    positionInput.placeholder = '位置'
    positionInput.addEventListener('input', processEnigma)
    
    const ringInput = document.createElement('input')
    ringInput.type = 'number'
    ringInput.id = 'reflectorRing'
    ringInput.min = 1
    ringInput.max = 26
    ringInput.value = 1
    ringInput.placeholder = '环设置'
    ringInput.addEventListener('input', processEnigma)
    
    reflectorRow.appendChild(document.createTextNode(' 位置: '))
    reflectorRow.appendChild(positionInput)
    reflectorRow.appendChild(document.createTextNode(' 环设置: '))
    reflectorRow.appendChild(ringInput)
  }
  
  rotorSettings.appendChild(reflectorRow)
  
  // 转子
  for (let i = 0; i < selectedModel.slots.length; i++) {
    const slot = selectedModel.slots[i]
    const rotors = EnigmaEncoder.getRotors(slot.rotors)
    const rotorContainer = document.createElement('div')
    rotorContainer.className = 'grid-3'
    const rotorColumn1 = document.createElement('div')
    const rotorSelect = document.createElement('select')
    rotorSelect.id = `enigmaRotor${i+1}`
    rotorSelect.addEventListener('change', processEnigma)
    rotors.forEach(rotor => {
      const option = document.createElement('option')
      option.value = rotor.name
      option.textContent = rotor.label
      rotorSelect.appendChild(option)
    })
    
    const rotorLabel = document.createElement('span')
    rotorLabel.textContent = `转子${i+1}: `
    rotorColumn1.appendChild(rotorLabel)
    rotorColumn1.appendChild(rotorSelect)
    const rotorColumn2 = document.createElement('div')
    const positionInput = document.createElement('input')
    positionInput.type = 'number'
    positionInput.id = `rotor${i+1}Position`
    positionInput.min = 1
    positionInput.max = 26
    positionInput.value = 1
    positionInput.placeholder = '位置'
    positionInput.addEventListener('input', processEnigma)
    const positionLabel = document.createElement('span')
    positionLabel.textContent = '位置: '
    rotorColumn2.appendChild(positionLabel)
    rotorColumn2.appendChild(positionInput)
    const rotorColumn3 = document.createElement('div')
    const ringInput = document.createElement('input')
    ringInput.type = 'number'
    ringInput.id = `rotor${i+1}Ring`
    ringInput.min = 1
    ringInput.max = 26
    ringInput.value = 1
    ringInput.placeholder = '环设置'
    ringInput.addEventListener('input', processEnigma)
    const ringLabel = document.createElement('span')
    ringLabel.textContent = '环设置: '
    rotorColumn3.appendChild(ringLabel)
    rotorColumn3.appendChild(ringInput)
    rotorContainer.appendChild(rotorColumn1)
    rotorContainer.appendChild(rotorColumn2)
    rotorContainer.appendChild(rotorColumn3)
    rotorSettings.appendChild(rotorContainer)
  }
  
  plugboardInput.parentElement.style.display = selectedModel.plugboard ? '' : 'none'
  processEnigma()
}

function processEnigma() {
  const inputText = document.getElementById('mainInput').value.toLowerCase();
  const result = document.getElementById('EnigmaResult');
  const modelSelect = document.getElementById('enigmaModel');
  if (!inputText) {result.textContent = ''; return;}
    const enigma = new EnigmaEncoder();
    const modelName = modelSelect.value;
    const selectedModel = EnigmaEncoder.getModel(modelName);
    enigma.setSettingValue('model', modelName);
    const reflectorSelect = document.getElementById('enigmaReflector');
    if (reflectorSelect) {
      enigma.setSettingValue('reflector', reflectorSelect.value);
    }
    
    const reflectorPosition = document.getElementById('reflectorPosition');
    const reflectorRing = document.getElementById('reflectorRing');
    if (reflectorPosition) {
      enigma.setSettingValue('positionReflector', parseInt(reflectorPosition.value, 10) || 1);
    }
    if (reflectorRing) {
      enigma.setSettingValue('ringReflector', parseInt(reflectorRing.value, 10) || 1);
    }
    
    for (let i = 0; i < selectedModel.slots.length; i++) {
      const rotorSelect = document.getElementById(`enigmaRotor${i+1}`);
      const positionInput = document.getElementById(`rotor${i+1}Position`);
      const ringInput = document.getElementById(`rotor${i+1}Ring`);
      if (rotorSelect && positionInput && ringInput) {
        enigma.setSettingValue(`rotor${i+1}`, rotorSelect.value);
        enigma.setSettingValue(`position${i+1}`, parseInt(positionInput.value, 10) || 1);
        enigma.setSettingValue(`ring${i+1}`, parseInt(ringInput.value, 10) || 1);
      }
    }
    
    if (selectedModel.plugboard) {
      const plugboardInput = document.getElementById('Plugboard');
      enigma.setSettingValue('plugboard', plugboardInput.value);
    }
    
    enigma.setSettingValue('includeForeignChars', true);
    result.textContent = `加密结果: ${enigma.encode(new StringContent(inputText)).getString()}`;

}

class StringContent {
  constructor(string) {this._string = string}
  getString() {return this._string}
  getCodePoints() {return Array.from(this._string).map(char => char.charCodeAt(0))}
}

// 数学工具类
const MathUtil = {mod: (n, m) => ((n % m) + m) % m}
const ArrayUtil = {
  isUnique: (arr) => new Set(arr).size === arr.length,
  unique: (arr) => [...new Set(arr)],
  shuffle: (arr, random) => {
    const newArr = [...arr]
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor((random || Math.random)() * (i + 1))
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
    } return newArr
  }
}

// 字符串工具类
const StringUtil = {
  chunk: (str, size) => {
    const chunks = []
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.substring(i, i + size))
    }
    return chunks
  }
}

window.EnigmaEncoder = EnigmaEncoder
window.models = Enigmamodels

