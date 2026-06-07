// Local AI config. This file is ignored by git.
window.AGENTMASTER_CONFIG = {
    apiKey: "sk-c5712a5d2be547cdabbacffbfb5b8a37",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-v4-flash",
    useNativeTools: true
};

window.DEEPSEEK_CONFIG = {
    apiKey: window.AGENTMASTER_CONFIG.apiKey,
    baseUrl: window.AGENTMASTER_CONFIG.baseUrl,
    defaultModel: window.AGENTMASTER_CONFIG.model,
    reasonerModel: window.AGENTMASTER_CONFIG.model
};
