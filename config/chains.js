// config/chains.js

export const CHAINS = {
    8453:  { chainId: 8453,  chainName: 'Base', contract: '0x0574A0941Ca659D01CF7370E37492bd2DF43128d' },
    1135:  { chainId: 1135,  chainName: 'Lisk', contract: '0x7Ca0a469164655AF07d27cf4bdA5e77F36Ab820A' },
    42220: { chainId: 42220, chainName: 'Celo', contract: '0xBC955DC38a13c2Cd8736DA1bC791514504202F9D' },
};

export function getChainName(chainId) {
    return CHAINS[chainId]?.chainName || `Unknown (${chainId})`;
}

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);
