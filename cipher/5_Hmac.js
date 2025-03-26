

const meta = {
  name: 'hmac',
  title: 'HMAC',
  category: 'Modern cryptography',
  type: 'encoder'
}

export default class HMACEncoder extends Encoder {
  static getMeta () {
    return meta
  }
  constructor () {
    super()
    this.setEncodeOnly(true)
    this._hashEncoder = new HashEncoder()
    const hashAlgorithmSetting = this._hashEncoder.getSetting('algorithm')

    this.addSettings([
      {
        name: 'key',
        type: 'bytes',
        value: new Uint8Array([99, 114, 121, 112, 116, 105, 105])
      },
      {
        name: 'algorithm',
        type: 'enum',
        value: hashAlgorithmSetting.getValue(),
        elements: hashAlgorithmSetting.getElements(),
        labels: hashAlgorithmSetting.getElementLabels(),
        randomizable: false,
        style: 'radio'
      }
    ])
  }

  async performEncode (content) {
    const message = content.getBytes()
    const algorithm = this.getSettingValue('algorithm')
    const blockSize = HashEncoder.getAlgorithmBlockSize(algorithm)
    let key = this.getSettingValue('key')
    if (key.length > blockSize) {
      key = await this.createDigest(algorithm, key)
    }
    const outerKey = new Uint8Array(blockSize)
    outerKey.set(key, 0)
    const innerMessage = new Uint8Array(blockSize + message.length)
    innerMessage.set(outerKey, 0)
    innerMessage.set(message, blockSize)
    for (let i = 0; i < blockSize; i++) {
      innerMessage[i] ^= 0x36
      outerKey[i] ^= 0x5C
    }
    const innerDigest = await this.createDigest(algorithm, innerMessage)
    const outerMessage = new Uint8Array(blockSize + innerDigest.length)
    outerMessage.set(outerKey, 0)
    outerMessage.set(innerDigest, blockSize)
    return this.createDigest(algorithm, outerMessage)
  }

  async createDigest (name, message) {
    if (this._hashEncoder === null) {
      this._hashEncoder = new HashEncoder()
    }
    this._hashEncoder.setSettingValue('algorithm', name)
    const digestChain = await this._hashEncoder.encode(message)
    return digestChain.getBytes()
  }
}
