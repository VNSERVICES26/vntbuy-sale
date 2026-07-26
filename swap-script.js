// swap-script.js - Testnet Configuration for BSC Testnet

const CONFIG = {
    // BSC Testnet Configuration
    testnet: {
        // ⚠️ IMPORTANT: Replace these with your ACTUAL deployed testnet contract addresses
        swapContractAddress: "0x63Ce5ED1175BFA8cC764124D7da5Fd6aA6353Bd6", // YOUR VirsenSwap address on testnet
        vntTokenAddress: "0xa7e41CB0A41dbFC801408d3B577fCed150c4eeEc", // YOUR VNT token address on testnet
        vnstTokenAddress: "0x5C6cB004b50278c6726c3cBEDd25165c2072C46D", // YOUR VNST token address on testnet
        // BSC Testnet USDT (BEP-20) - This is a common testnet USDT
        usdtTokenAddress: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // BSC Testnet USDT
        chainId: "0x61", // BSC Testnet chain ID
        rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/"
    },
    // Mainnet Configuration (keep for reference)
    mainnet: {
        swapContractAddress: "0xCe5456f15f8331996Ce9c93356bFDff8b93EC38e",
        vntTokenAddress: "0xD379Fd70C5C334bb31208122A6781ADB032D176f",
        vnstTokenAddress: "0x1234567890123456789012345678901234567890",
        usdtTokenAddress: "0x55d398326f99059fF775485246999027B3197955",
        chainId: "0x38",
        rpcUrl: "https://bsc-dataseed.binance.org/"
    }
};

// Use testnet by default (change to 'mainnet' for production)
const NETWORK = 'testnet';

let web3;
let swapContract;
let vntToken;
let vnstToken;
let usdtToken;
let currentAccount = null;
let vntDecimals = 18;
let vnstDecimals = 18;
let usdtDecimals = 18;
let minSwapAmount = 0;
let swapFeeBNB = 0;
let vntPrice = 0;
let vnstPrice = 0;
let vntToVnstPrice = 0;
let contractInitialized = false;

// Complete VirsenSwap ABI
const SWAP_ABI = [
    // State variables
    {"inputs":[],"name":"VNT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"VNST","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"USDT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"minSwapAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"swapFeeBNB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vntPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vntToVnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vntTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vnstTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"usdtTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"feeWallet","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalSwapped","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userSwaps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    
    // View functions
    {"inputs":[],"name":"getContractInfo","outputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"bool","name":"_paused","type":"bool"},{"internalType":"uint256","name":"_minSwap","type":"uint256"},{"internalType":"uint256","name":"_fee","type":"uint256"},{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"},{"internalType":"uint256","name":"_totalSwapped","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNSTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSellVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSwapVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserAllowances","outputs":[{"internalType":"uint256","name":"vnt","type":"uint256"},{"internalType":"uint256","name":"vnst","type":"uint256"},{"internalType":"uint256","name":"usdt","type":"uint256"}],"stateMutability":"view","type":"function"},
    
    // Write functions
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"internalType":"uint256","name":"minVntOut","type":"uint256"}],"name":"buyVNT","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"internalType":"uint256","name":"minVnstOut","type":"uint256"}],"name":"buyVNST","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"},{"internalType":"uint256","name":"minUsdtOut","type":"uint256"}],"name":"sellVNT","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"},{"internalType":"uint256","name":"minVnstOut","type":"uint256"}],"name":"swapVNTToVNST","outputs":[],"stateMutability":"payable","type":"function"}
];

// Token ABI - Minimal
const TOKEN_ABI = [
    {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
];

// Faucet URLs for Testnet
const FAUCET_URLS = {
    bnb: "https://testnet.binance.org/faucet-smart",
    usdt: "https://testnet.bscscan.com/address/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd#writeContract"
};

// Network switch helper
async function switchToTestnet() {
    if (!window.ethereum) return false;
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x61' }],
        });
        return true;
    } catch (error) {
        if (error.code === 4902) {
            // Add testnet if not present
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x61',
                        chainName: 'BSC Testnet',
                        nativeCurrency: {
                            name: 'BNB',
                            symbol: 'BNB',
                            decimals: 18
                        },
                        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                        blockExplorerUrls: ['https://testnet.bscscan.com']
                    }]
                });
                return true;
            } catch (addError) {
                console.error('Failed to add testnet:', addError);
                return false;
            }
        }
        console.error('Failed to switch to testnet:', error);
        return false;
    }
}

window.addEventListener('load', async () => {
    try {
        console.log(`VirsenSwap UI initializing on ${NETWORK}...`);
        
        // Check if on correct network
        if (window.ethereum) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const config = CONFIG[NETWORK];
            if (chainId !== config.chainId) {
                showMessage(`Please switch to ${NETWORK.toUpperCase()} network`, 'error');
                const switched = await switchToTestnet();
                if (!switched) {
                    showMessage('Please manually switch to BSC Testnet in your wallet', 'error');
                }
            }
        }
        
        await setupEventListeners();
        await checkWalletConnection();
        await initContracts();
        setupInputListeners();
        setupTabSystem();
        updateUI();
        console.log(`VirsenSwap UI initialized successfully on ${NETWORK}`);
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Failed to initialize: ' + error.message, 'error');
    }
});

function setupTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const section = document.getElementById(`${tabId}Section`);
            if (section) section.classList.add('active');
            
            if (currentAccount && contractInitialized) {
                if (tabId === 'buy') updateBuyQuote();
                else if (tabId === 'sell') updateSellQuote();
                else if (tabId === 'swap') updateSwapQuote();
            }
        });
    });
}

async function setupEventListeners() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    
    const buyVNTBtn = document.getElementById('buyVNTBtn');
    if (buyVNTBtn) buyVNTBtn.addEventListener('click', () => buyVNT());
    
    const buyVNSTBtn = document.getElementById('buyVNSTBtn');
    if (buyVNSTBtn) buyVNSTBtn.addEventListener('click', () => buyVNST());
    
    const sellVNTBtn = document.getElementById('sellVNTBtn');
    if (sellVNTBtn) sellVNTBtn.addEventListener('click', () => sellVNT());
    
    const swapBtn = document.getElementById('swapVNTToVNSTBtn');
    if (swapBtn) swapBtn.addEventListener('click', () => swapVNTToVNST());
    
    const copyBtn = document.getElementById('copyContractBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyContractAddress);
}

function setupInputListeners() {
    const usdtInput = document.getElementById('usdtAmountBuy');
    if (usdtInput) usdtInput.addEventListener('input', updateBuyQuote);
    
    const vntSellInput = document.getElementById('vntAmountSell');
    if (vntSellInput) vntSellInput.addEventListener('input', updateSellQuote);
    
    const vntSwapInput = document.getElementById('vntAmountSwap');
    if (vntSwapInput) vntSwapInput.addEventListener('input', updateSwapQuote);
}

function toTokenUnits(amount, decimals = 18) {
    try {
        if (!web3 || !amount || amount === '' || isNaN(Number(amount))) {
            return web3 ? web3.utils.toBN(0) : 0;
        }
        const amountStr = amount.toString().trim();
        if (amountStr === '') return web3.utils.toBN(0);

        if (amountStr.indexOf('.') === -1) {
            return web3.utils.toBN(amountStr).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
        }

        const parts = amountStr.split('.');
        const whole = parts[0] || '0';
        let fraction = parts[1] || '';
        if (fraction.length > decimals) {
            fraction = fraction.substring(0, decimals);
        }
        while (fraction.length < decimals) fraction += '0';

        const wholeBN = web3.utils.toBN(whole).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
        const fractionBN = web3.utils.toBN(fraction);
        return wholeBN.add(fractionBN);
    } catch (error) {
        console.error('toTokenUnits error:', error);
        return web3 ? web3.utils.toBN(0) : 0;
    }
}

function formatUnits(value, decimals = 18, maxFractionDigits = 6) {
    try {
        if (!web3) return '0';
        const BN = web3.utils.toBN;
        let bnValue;
        if (typeof value === 'string' && value.match(/^\d+$/)) {
            bnValue = BN(value);
        } else if (typeof value === 'number') {
            bnValue = BN(String(Math.floor(value)));
        } else if (value && value.toString) {
            try {
                bnValue = BN(value.toString());
            } catch (e) {
                return String(value);
            }
        } else {
            return '0';
        }

        const base = BN(10).pow(BN(decimals));
        const whole = bnValue.div(base).toString();
        let fractionBN = bnValue.mod(base).toString().padStart(decimals, '0');

        if (Number(fractionBN) === 0) {
            return Number(whole).toLocaleString();
        }

        fractionBN = fractionBN.substring(0, maxFractionDigits);
        fractionBN = fractionBN.replace(/0+$/, '');
        if (fractionBN === '') return Number(whole).toLocaleString();
        return `${Number(whole).toLocaleString()}.${fractionBN}`;
    } catch (error) {
        console.error('formatUnits error:', error);
        return String(value || '0');
    }
}

async function checkWalletConnection() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                currentAccount = accounts[0];
                setupWalletEvents();
                await updateWalletInfo();
            }
        } catch (error) {
            console.error("Error checking wallet connection:", error);
        }
    } else {
        console.log('No Ethereum wallet detected');
        showMessage('Please install MetaMask to use this app', 'error');
    }
}

function setupWalletEvents() {
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
            currentAccount = accounts && accounts.length > 0 ? accounts[0] : null;
            updateUI();
            if (currentAccount && contractInitialized) {
                await updateWalletInfo();
                updateBuyQuote();
                updateSellQuote();
                updateSwapQuote();
            }
        });
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
        window.ethereum.on('disconnect', () => {
            currentAccount = null;
            updateUI();
            showMessage('Wallet disconnected', 'error');
        });
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        showMessage('Please install MetaMask or another Web3 wallet', 'error');
        return;
    }

    try {
        // Check if on testnet
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const config = CONFIG[NETWORK];
        if (chainId !== config.chainId) {
            showMessage(`Please switch to ${NETWORK.toUpperCase()} network`, 'error');
            const switched = await switchToTestnet();
            if (!switched) {
                showMessage('Please manually switch to BSC Testnet in your wallet', 'error');
                return;
            }
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
            currentAccount = accounts[0];
            setupWalletEvents();
            await updateWalletInfo();
            showMessage('Wallet connected successfully on Testnet!', 'success');
            updateUI();
            if (contractInitialized) {
                updateBuyQuote();
                updateSellQuote();
                updateSwapQuote();
            }
        }
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected connection request', 'error');
        } else {
            showMessage(`Error connecting wallet: ${error.message}`, 'error');
        }
    }
}

async function updateWalletInfo() {
    if (!currentAccount || !contractInitialized) {
        document.getElementById('walletInfo').classList.add('hidden');
        return;
    }

    try {
        const vntBal = await vntToken.methods.balanceOf(currentAccount).call();
        const vnstBal = await vnstToken.methods.balanceOf(currentAccount).call();
        const usdtBal = await usdtToken.methods.balanceOf(currentAccount).call();
        
        document.getElementById('walletAddress').textContent = shortenAddress(currentAccount);
        document.getElementById('vntBalance').textContent = formatUnits(vntBal, vntDecimals);
        document.getElementById('vnstBalance').textContent = formatUnits(vnstBal, vnstDecimals);
        document.getElementById('usdtBalance').textContent = formatUnits(usdtBal, usdtDecimals);
        document.getElementById('walletInfo').classList.remove('hidden');
        
        // Show testnet info
        const statusDiv = document.getElementById('walletStatus');
        statusDiv.innerHTML = `<div class="status-message">🌐 BSC Testnet - Use test tokens</div>`;
    } catch (error) {
        console.error('Error updating wallet info:', error);
        document.getElementById('walletInfo').classList.add('hidden');
    }
}

async function initContracts() {
    try {
        const config = CONFIG[NETWORK];
        
        console.log(`Initializing contracts on ${NETWORK} at:`, config.swapContractAddress);
        
        // Check if web3 is available
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
        } else {
            web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl));
        }
        
        // Initialize swap contract
        swapContract = new web3.eth.Contract(SWAP_ABI, config.swapContractAddress);
        
        // Initialize token contracts
        vntToken = new web3.eth.Contract(TOKEN_ABI, config.vntTokenAddress);
        vnstToken = new web3.eth.Contract(TOKEN_ABI, config.vnstTokenAddress);
        usdtToken = new web3.eth.Contract(TOKEN_ABI, config.usdtTokenAddress);
        
        // Get contract info
        try {
            const info = await swapContract.methods.getContractInfo().call();
            vntPrice = info._vntPrice;
            vnstPrice = info._vnstPrice;
            vntToVnstPrice = info._vntToVnstPrice;
            minSwapAmount = info._minSwap;
            swapFeeBNB = info._fee;
            console.log('Contract info loaded successfully');
        } catch (err) {
            console.warn('Error getting contract info, trying individual calls:', err);
            // Fallback: get individual values
            vntPrice = await swapContract.methods.vntPrice().call();
            vnstPrice = await swapContract.methods.vnstPrice().call();
            vntToVnstPrice = await swapContract.methods.vntToVnstPrice().call();
            minSwapAmount = await swapContract.methods.minSwapAmount().call();
            swapFeeBNB = await swapContract.methods.swapFeeBNB().call();
            console.log('Contract info loaded individually');
        }
        
        // Get decimals
        try {
            vntDecimals = await vntToken.methods.decimals().call();
            vnstDecimals = await vnstToken.methods.decimals().call();
            usdtDecimals = await usdtToken.methods.decimals().call();
        } catch (err) {
            console.warn('Error getting decimals, using defaults:', err);
            // Keep defaults (18)
        }
        
        // Update UI with contract data
        document.getElementById('vntPrice').textContent = formatUnits(vntPrice, 18) + ' USDT';
        document.getElementById('vnstPrice').textContent = formatUnits(vnstPrice, 18) + ' USDT';
        document.getElementById('minSwapAmount').textContent = formatUnits(minSwapAmount, usdtDecimals) + ' USDT/VNT';
        document.getElementById('swapFee').textContent = formatUnits(swapFeeBNB, 18) + ' BNB';
        
        document.getElementById('sellVNTPrice').textContent = formatUnits(vntPrice, 18) + ' USDT/VNT';
        document.getElementById('sellMinSwap').textContent = formatUnits(minSwapAmount, vntDecimals) + ' VNT';
        document.getElementById('sellFee').textContent = formatUnits(swapFeeBNB, 18) + ' BNB';
        
        document.getElementById('swapRate').textContent = formatUnits(vntToVnstPrice, 18) + ' VNST/VNT';
        document.getElementById('swapMin').textContent = formatUnits(minSwapAmount, vntDecimals) + ' VNT';
        document.getElementById('swapFeeDisplay').textContent = formatUnits(swapFeeBNB, 18) + ' BNB';
        
        document.getElementById('contractAddress').textContent = config.swapContractAddress;
        
        contractInitialized = true;
        
        if (currentAccount) {
            await updateWalletInfo();
            updateBuyQuote();
            updateSellQuote();
            updateSwapQuote();
        }
        
        console.log('Contracts initialized successfully on testnet');
    } catch (error) {
        console.error('Error initializing contracts:', error);
        showMessage(`Error initializing contracts: ${error.message}. Please check contract addresses.`, 'error');
        contractInitialized = false;
    }
}

async function updateBuyQuote() {
    if (!contractInitialized || !currentAccount) return;
    
    const usdtAmount = document.getElementById('usdtAmountBuy').value;
    const quoteResult = document.getElementById('buyQuoteResult');
    const quoteText = document.getElementById('buyQuoteText');
    
    if (!usdtAmount || isNaN(usdtAmount) || Number(usdtAmount) <= 0) {
        quoteResult.classList.add('hidden');
        document.getElementById('buyVNTBtn').disabled = true;
        document.getElementById('buyVNSTBtn').disabled = true;
        return;
    }

    try {
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        const minSwapBN = web3.utils.toBN(minSwapAmount);
        
        if (usdtBN.lt(minSwapBN)) {
            quoteResult.classList.remove('hidden');
            quoteText.textContent = `⚠️ Min swap: ${formatUnits(minSwapAmount, usdtDecimals)} USDT`;
            document.getElementById('buyVNTBtn').disabled = true;
            document.getElementById('buyVNSTBtn').disabled = true;
            return;
        }

        const vntOut = await swapContract.methods.getVNTQuote(usdtBN.toString()).call();
        const vnstOut = await swapContract.methods.getVNSTQuote(usdtBN.toString()).call();
        
        quoteResult.classList.remove('hidden');
        quoteText.innerHTML = `VNT: ${formatUnits(vntOut, vntDecimals)} | VNST: ${formatUnits(vnstOut, vnstDecimals)}`;
        
        document.getElementById('buyVNTBtn').disabled = false;
        document.getElementById('buyVNSTBtn').disabled = false;
    } catch (error) {
        console.error('Buy quote error:', error);
        quoteResult.classList.remove('hidden');
        quoteText.textContent = 'Error calculating quote';
        document.getElementById('buyVNTBtn').disabled = true;
        document.getElementById('buyVNSTBtn').disabled = true;
    }
}

async function updateSellQuote() {
    if (!contractInitialized || !currentAccount) return;
    
    const vntAmount = document.getElementById('vntAmountSell').value;
    const quoteResult = document.getElementById('sellQuoteResult');
    const quoteText = document.getElementById('sellQuoteText');
    
    if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
        quoteResult.classList.add('hidden');
        document.getElementById('sellVNTBtn').disabled = true;
        return;
    }

    try {
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minSwapAmount);
        
        if (vntBN.lt(minSwapBN)) {
            quoteResult.classList.remove('hidden');
            quoteText.textContent = `⚠️ Min swap: ${formatUnits(minSwapAmount, vntDecimals)} VNT`;
            document.getElementById('sellVNTBtn').disabled = true;
            return;
        }

        const usdtOut = await swapContract.methods.getSellVNTQuote(vntBN.toString()).call();
        
        quoteResult.classList.remove('hidden');
        quoteText.textContent = `You will receive: ${formatUnits(usdtOut, usdtDecimals)} USDT`;
        
        document.getElementById('sellVNTBtn').disabled = false;
    } catch (error) {
        console.error('Sell quote error:', error);
        quoteResult.classList.remove('hidden');
        quoteText.textContent = 'Error calculating quote';
        document.getElementById('sellVNTBtn').disabled = true;
    }
}

async function updateSwapQuote() {
    if (!contractInitialized || !currentAccount) return;
    
    const vntAmount = document.getElementById('vntAmountSwap').value;
    const quoteResult = document.getElementById('swapQuoteResult');
    const quoteText = document.getElementById('swapQuoteText');
    
    if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
        quoteResult.classList.add('hidden');
        document.getElementById('swapVNTToVNSTBtn').disabled = true;
        return;
    }

    try {
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minSwapAmount);
        
        if (vntBN.lt(minSwapBN)) {
            quoteResult.classList.remove('hidden');
            quoteText.textContent = `⚠️ Min swap: ${formatUnits(minSwapAmount, vntDecimals)} VNT`;
            document.getElementById('swapVNTToVNSTBtn').disabled = true;
            return;
        }

        const vnstOut = await swapContract.methods.getSwapVNTQuote(vntBN.toString()).call();
        
        quoteResult.classList.remove('hidden');
        quoteText.textContent = `You will receive: ${formatUnits(vnstOut, vnstDecimals)} VNST`;
        
        document.getElementById('swapVNTToVNSTBtn').disabled = false;
    } catch (error) {
        console.error('Swap quote error:', error);
        quoteResult.classList.remove('hidden');
        quoteText.textContent = 'Error calculating quote';
        document.getElementById('swapVNTToVNSTBtn').disabled = true;
    }
}

async function checkAllowance(token, owner, spender, amount) {
    try {
        const allowance = await token.methods.allowance(owner, spender).call();
        return web3.utils.toBN(allowance).gte(web3.utils.toBN(amount));
    } catch (error) {
        console.error('Allowance check error:', error);
        return false;
    }
}

async function approveToken(token, spender, amount, tokenName) {
    try {
        showMessage(`Approving ${tokenName}...`, 'status');
        const result = await token.methods.approve(spender, amount).send({
            from: currentAccount
        });
        showMessage(`${tokenName} approved successfully!`, 'success');
        return true;
    } catch (error) {
        if (error.code === 4001) {
            showMessage(`User rejected ${tokenName} approval`, 'error');
        } else {
            showMessage(`Approval failed: ${error.message}`, 'error');
        }
        return false;
    }
}

async function buyVNT() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }

    try {
        const usdtAmount = document.getElementById('usdtAmountBuy').value;
        if (!usdtAmount || isNaN(usdtAmount) || Number(usdtAmount) <= 0) {
            showMessage('Please enter a valid USDT amount', 'error');
            return;
        }
        
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        const minSwapBN = web3.utils.toBN(minSwapAmount);
        
        if (usdtBN.lt(minSwapBN)) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, usdtDecimals)} USDT`, 'error');
            return;
        }

        // Check allowance
        const hasAllowance = await checkAllowance(usdtToken, currentAccount, CONFIG[NETWORK].swapContractAddress, usdtBN);
        if (!hasAllowance) {
            const approved = await approveToken(usdtToken, CONFIG[NETWORK].swapContractAddress, usdtBN.toString(), 'USDT');
            if (!approved) return;
        }

        // Get quote for slippage (5% tolerance)
        const vntQuote = await swapContract.methods.getVNTQuote(usdtBN.toString()).call();
        const minOut = web3.utils.toBN(vntQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('Processing buy VNT on testnet...', 'status');
        const result = await swapContract.methods.buyVNT(usdtBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB
        });
        
        showMessage('VNT purchased successfully on testnet!', 'success');
        await updateWalletInfo();
        updateBuyQuote();
    } catch (error) {
        console.error('Buy VNT error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else if (error.message && error.message.includes('insufficient')) {
            showMessage('Insufficient USDT balance or allowance. Get test USDT from faucet.', 'error');
        } else {
            showMessage(`Purchase failed: ${error.message}`, 'error');
        }
    }
}

async function buyVNST() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }

    try {
        const usdtAmount = document.getElementById('usdtAmountBuy').value;
        if (!usdtAmount || isNaN(usdtAmount) || Number(usdtAmount) <= 0) {
            showMessage('Please enter a valid USDT amount', 'error');
            return;
        }
        
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        const minSwapBN = web3.utils.toBN(minSwapAmount);
        
        if (usdtBN.lt(minSwapBN)) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, usdtDecimals)} USDT`, 'error');
            return;
        }

        const hasAllowance = await checkAllowance(usdtToken, currentAccount, CONFIG[NETWORK].swapContractAddress, usdtBN);
        if (!hasAllowance) {
            const approved = await approveToken(usdtToken, CONFIG[NETWORK].swapContractAddress, usdtBN.toString(), 'USDT');
            if (!approved) return;
        }

        const vnstQuote = await swapContract.methods.getVNSTQuote(usdtBN.toString()).call();
        const minOut = web3.utils.toBN(vnstQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('Processing buy VNST on testnet...', 'status');
        const result = await swapContract.methods.buyVNST(usdtBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB
        });
        
        showMessage('VNST purchased successfully on testnet!', 'success');
        await updateWalletInfo();
        updateBuyQuote();
    } catch (error) {
        console.error('Buy VNST error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Purchase failed: ${error.message}`, 'error');
        }
    }
}

async function sellVNT() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }

    try {
        const vntAmount = document.getElementById('vntAmountSell').value;
        if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
            showMessage('Please enter a valid VNT amount', 'error');
            return;
        }
        
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minSwapAmount);
        
        if (vntBN.lt(minSwapBN)) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, vntDecimals)} VNT`, 'error');
            return;
        }

        const hasAllowance = await checkAllowance(vntToken, currentAccount, CONFIG[NETWORK].swapContractAddress, vntBN);
        if (!hasAllowance) {
            const approved = await approveToken(vntToken, CONFIG[NETWORK].swapContractAddress, vntBN.toString(), 'VNT');
            if (!approved) return;
        }

        const usdtQuote = await swapContract.methods.getSellVNTQuote(vntBN.toString()).call();
        const minOut = web3.utils.toBN(usdtQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('Processing sell VNT on testnet...', 'status');
        const result = await swapContract.methods.sellVNT(vntBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB
        });
        
        showMessage('VNT sold successfully on testnet!', 'success');
        await updateWalletInfo();
        updateSellQuote();
    } catch (error) {
        console.error('Sell VNT error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Sale failed: ${error.message}`, 'error');
        }
    }
}

async function swapVNTToVNST() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }

    try {
        const vntAmount = document.getElementById('vntAmountSwap').value;
        if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
            showMessage('Please enter a valid VNT amount', 'error');
            return;
        }
        
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minSwapAmount);
        
        if (vntBN.lt(minSwapBN)) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, vntDecimals)} VNT`, 'error');
            return;
        }

        const hasAllowance = await checkAllowance(vntToken, currentAccount, CONFIG[NETWORK].swapContractAddress, vntBN);
        if (!hasAllowance) {
            const approved = await approveToken(vntToken, CONFIG[NETWORK].swapContractAddress, vntBN.toString(), 'VNT');
            if (!approved) return;
        }

        const vnstQuote = await swapContract.methods.getSwapVNTQuote(vntBN.toString()).call();
        const minOut = web3.utils.toBN(vnstQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('Processing swap VNT → VNST on testnet...', 'status');
        const result = await swapContract.methods.swapVNTToVNST(vntBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB
        });
        
        showMessage('VNT → VNST swapped successfully on testnet!', 'success');
        await updateWalletInfo();
        updateSwapQuote();
    } catch (error) {
        console.error('Swap VNT → VNST error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Swap failed: ${error.message}`, 'error');
        }
    }
}

function copyContractAddress() {
    const address = document.getElementById('contractAddress').textContent;
    if (address && address !== 'Loading...') {
        navigator.clipboard.writeText(address).then(() => {
            showMessage('Contract address copied!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = address;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showMessage('Contract address copied!', 'success');
        });
    }
}

function updateUI() {
    const isConnected = currentAccount !== null;
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.textContent = isConnected ? 'Connected' : 'Connect Wallet';
    }
    const walletInfo = document.getElementById('walletInfo');
    if (walletInfo) {
        walletInfo.classList.toggle('hidden', !isConnected);
    }
}

function shortenAddress(address) {
    if (!address) return '-';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function showMessage(message, type = 'status') {
    const statusDiv = document.getElementById('statusMessages');
    if (!statusDiv) return;
    
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.classList.add(`${type}-message`);
    statusDiv.appendChild(messageElement);
    
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
}
