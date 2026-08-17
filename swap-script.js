const CONFIG = {
    mainnet: {
        swapContractAddress: "0x524f6a2694Acb20d462f2e80F0451963dE9a06e3",
        vntTokenAddress: "0xD379Fd70C5C334bb31208122A6781ADB032D176f",
        vnstTokenAddress: "0xF9Bbb00436B384b57A52D1DfeA8Ca43fC7F11527",
        usdtTokenAddress: "0x55d398326f99059fF775485246999027B3197955",
        chainId: "0x38",
        rpcUrl: "https://bsc-dataseed.binance.org/"
    }
};

const NETWORK = 'mainnet';

let web3, swapContract, vntToken, vnstToken, usdtToken;
let currentAccount = null;
let vntDecimals = 18, vnstDecimals = 18, usdtDecimals = 18;
let minVNTBuyAmount = 0, minVNSTBuyAmount = 0, minVNTSwapAmount = 0;
let maxVNTSaleAmount = 0;
let swapFeeBNB = 0, vntPrice = 0, vnstPrice = 0, vntToVnstPrice = 0;
let contractInitialized = false;
let isProcessing = false;

// Gas Settings - अब dynamic होगा
const GAS_LIMIT = 800000;

async function getGasPrice() {
    try {
        return await web3.eth.getGasPrice();
    } catch (error) {
        console.error('Error getting gas price:', error);
        return web3.utils.toWei('5', 'gwei');
    }
}

// ============================================================
// formatUnits Function
// ============================================================
function formatUnits(value, decimals = 18, maxFractionDigits = 6) {
    try {
        if (!web3) return '0';
        if (value === undefined || value === null || value === '') return '0';
        
        let numValue;
        if (typeof value === 'string') {
            numValue = BigInt(value);
        } else if (typeof value === 'number') {
            numValue = BigInt(Math.floor(value));
        } else if (value && value.toString) {
            numValue = BigInt(value.toString());
        } else {
            return '0';
        }
        
        const divisor = BigInt(10) ** BigInt(decimals);
        const whole = numValue / divisor;
        let fraction = numValue % divisor;
        
        if (whole === 0n && fraction === 0n) return '0';
        
        let fractionStr = fraction.toString().padStart(decimals, '0');
        if (fractionStr.length > maxFractionDigits) {
            fractionStr = fractionStr.substring(0, maxFractionDigits);
        }
        fractionStr = fractionStr.replace(/0+$/, '');
        
        if (fractionStr === '') {
            return whole.toString();
        }
        
        const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return `${wholeStr}.${fractionStr}`;
    } catch (error) {
        console.error('formatUnits error:', error);
        return String(value || '0');
    }
}

// ============================================================
// toTokenUnits Function
// ============================================================
function toTokenUnits(amount, decimals = 18) {
    try {
        if (!web3 || !amount || amount === '' || isNaN(Number(amount))) {
            return web3 ? web3.utils.toBN(0).toString() : '0';
        }
        const amountStr = amount.toString().trim();
        if (amountStr === '') return web3.utils.toBN(0).toString();
        if (amountStr.indexOf('.') === -1) {
            return web3.utils.toBN(amountStr).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals))).toString();
        }
        const parts = amountStr.split('.');
        const whole = parts[0] || '0';
        let fraction = parts[1] || '';
        if (fraction.length > decimals) fraction = fraction.substring(0, decimals);
        while (fraction.length < decimals) fraction += '0';
        const wholeBN = web3.utils.toBN(whole).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
        const fractionBN = web3.utils.toBN(fraction);
        return wholeBN.add(fractionBN).toString();
    } catch (error) {
        console.error('toTokenUnits error:', error);
        return '0';
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
        if (messageElement.parentNode) messageElement.remove();
    }, 8000);
}

// ============================================================
// 🔧 FIXED: Web3 Initialization
// ============================================================
async function initWeb3() {
    try {
        if (window.ethereum) {
            // Modern MetaMask
            web3 = new Web3(window.ethereum);
            
            // MetaMask को activate करें
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log('✅ MetaMask connected');
            } catch (e) {
                console.log('MetaMask request accounts:', e);
            }
        } else if (window.web3) {
            // Legacy dApp browsers
            web3 = new Web3(window.web3.currentProvider);
            console.log('✅ Legacy web3 connected');
        } else {
            // Fallback to RPC
            web3 = new Web3(new Web3.providers.HttpProvider(CONFIG[NETWORK].rpcUrl));
            console.log('✅ RPC connected');
        }
        return true;
    } catch (error) {
        console.error('❌ Web3 init error:', error);
        showMessage('Failed to connect to Web3', 'error');
        return false;
    }
}

const SWAP_ABI = [{"inputs":[{"internalType":"address","name":"_vnt","type":"address"},{"internalType":"address","name":"_vnst","type":"address"},{"internalType":"address","name":"_usdt","type":"address"},{"internalType":"address payable","name":"_feeWallet","type":"address"},{"internalType":"address","name":"_vntTreasury","type":"address"},{"internalType":"address","name":"_vnstTreasury","type":"address"},{"internalType":"address","name":"_usdtTreasury","type":"address"},{"internalType":"address","name":"_fundWallet","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"AlreadyPaused","type":"error"},{"inputs":[],"name":"AmountTooSmall","type":"error"},{"inputs":[],"name":"ContractPaused","type":"error"},{"inputs":[],"name":"FeeMismatch","type":"error"},{"inputs":[],"name":"InsufficientAllowance","type":"error"},{"inputs":[],"name":"InsufficientBalance","type":"error"},{"inputs":[],"name":"InvalidAddress","type":"error"},{"inputs":[],"name":"InvalidAmount","type":"error"},{"inputs":[],"name":"InvalidFee","type":"error"},{"inputs":[],"name":"InvalidToken","type":"error"},{"inputs":[],"name":"MinSwapNotMet","type":"error"},{"inputs":[],"name":"NotOwner","type":"error"},{"inputs":[],"name":"NotPaused","type":"error"},{"inputs":[],"name":"ReentrancyGuard","type":"error"},{"inputs":[],"name":"TransferFailed","type":"error"},{"inputs":[],"name":"ZeroMinSwap","type":"error"},{"inputs":[],"name":"ZeroPrice","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldLimit","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"DailySellLimitUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldWallet","type":"address"},{"indexed":false,"internalType":"address","name":"newWallet","type":"address"}],"name":"FeeWalletUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldWallet","type":"address"},{"indexed":false,"internalType":"address","name":"newWallet","type":"address"}],"name":"FundWalletUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldMax","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newMax","type":"uint256"}],"name":"MaxSwapUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldMin","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newMin","type":"uint256"}],"name":"MinSwapUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"pair","type":"string"},{"indexed":false,"internalType":"uint256","name":"oldPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"PriceUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldPercentage","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newPercentage","type":"uint256"}],"name":"SplitPercentageUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"fromToken","type":"address"},{"indexed":false,"internalType":"address","name":"toToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minAmountOut","type":"uint256"}],"name":"SwapExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"SwapFeeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"treasury","type":"string"},{"indexed":false,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":false,"internalType":"address","name":"newAddress","type":"address"}],"name":"TreasuryUpdated","type":"event"},{"anonymous":false,"inputs":[],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vnstReceived","type":"uint256"}],"name":"VNSTPurchased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vntReceived","type":"uint256"}],"name":"VNTPurchased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntSold","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdtReceived","type":"uint256"}],"name":"VNTSold","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vnstReceived","type":"uint256"}],"name":"VNTSwapped","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"PERCENTAGE_BASE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"USDT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"VNST","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"VNT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"buyVNST","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"buyVNT","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"dailySellLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dailyVNTSold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"emergencyWithdrawAllBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdrawBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"feeWallet","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"fundWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBNBBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractInfo","outputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"bool","name":"_paused","type":"bool"},{"internalType":"uint256","name":"_minVNTBuy","type":"uint256"},{"internalType":"uint256","name":"_maxVNTBuy","type":"uint256"},{"internalType":"uint256","name":"_minVNSTBuy","type":"uint256"},{"internalType":"uint256","name":"_minVNTSwap","type":"uint256"},{"internalType":"uint256","name":"_fee","type":"uint256"},{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"},{"internalType":"uint256","name":"_totalSwapped","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getFundWalletBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getRemainingSellLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSellVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSwapVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTreasuryBalances","outputs":[{"internalType":"uint256","name":"vntBal","type":"uint256"},{"internalType":"uint256","name":"vnstBal","type":"uint256"},{"internalType":"uint256","name":"usdtBal","type":"uint256"},{"internalType":"uint256","name":"bnbBal","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserAllowances","outputs":[{"internalType":"uint256","name":"vnt","type":"uint256"},{"internalType":"uint256","name":"vnst","type":"uint256"},{"internalType":"uint256","name":"usdt","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserTotalSwaps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNSTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"},{"internalType":"uint256","name":"_swapFeeBNB","type":"uint256"},{"internalType":"uint256","name":"_dailySellLimit","type":"uint256"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"initialized","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lastTradeTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxVNTSaleAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minVNSTBuyAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minVNTBuyAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minVNTSwapAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"sellVNT","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"}],"name":"setAllPrices","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_vnt","type":"address"},{"internalType":"address","name":"_vnst","type":"address"},{"internalType":"address","name":"_usdt","type":"address"}],"name":"setAllTreasuries","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"setDailySellLimit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address payable","name":"newWallet","type":"address"}],"name":"setFeeWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newFundWallet","type":"address"}],"name":"setFundWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newMax","type":"uint256"}],"name":"setMaxVNTSale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newMin","type":"uint256"}],"name":"setMinVNSTBuy","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newMin","type":"uint256"}],"name":"setMinVNTBuy","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newMin","type":"uint256"}],"name":"setMinVNTSwap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPercentage","type":"uint256"}],"name":"setSplitPercentage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"setSwapFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setUSDTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNSTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setVNSTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNTToVNSTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setVNTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"splitPercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"swapFeeBNB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"swapVNTToVNST","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"totalSwapped","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"usdtTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userSwaps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntToVnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"stateMutability":"payable","type":"receive"}];

const TOKEN_ABI = [
    {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
];

// ============================================================
// initContracts Function (FIXED)
// ============================================================
async function initContracts() {
    try {
        // पहले Web3 init करें
        const web3Init = await initWeb3();
        if (!web3Init) return;
        
        const config = CONFIG[NETWORK];
        console.log(`Initializing contracts on mainnet at:`, config.swapContractAddress);
        
        swapContract = new web3.eth.Contract(SWAP_ABI, config.swapContractAddress);
        vntToken = new web3.eth.Contract(TOKEN_ABI, config.vntTokenAddress);
        vnstToken = new web3.eth.Contract(TOKEN_ABI, config.vnstTokenAddress);
        usdtToken = new web3.eth.Contract(TOKEN_ABI, config.usdtTokenAddress);
        
        try {
            vntPrice = await swapContract.methods.vntPrice().call();
            vnstPrice = await swapContract.methods.vnstPrice().call();
            vntToVnstPrice = await swapContract.methods.vntToVnstPrice().call();
            minVNTBuyAmount = await swapContract.methods.minVNTBuyAmount().call();
            maxVNTSaleAmount = await swapContract.methods.maxVNTSaleAmount().call();
            minVNSTBuyAmount = await swapContract.methods.minVNSTBuyAmount().call();
            minVNTSwapAmount = await swapContract.methods.minVNTSwapAmount().call();
            swapFeeBNB = await swapContract.methods.swapFeeBNB().call();
            
            console.log('✅ Contract values loaded successfully');
        } catch (err) {
            console.error('Error loading contract values:', err);
            showMessage('Error loading contract data', 'error');
            return;
        }
        
        try {
            vntDecimals = await vntToken.methods.decimals().call();
            vnstDecimals = await vnstToken.methods.decimals().call();
            usdtDecimals = await usdtToken.methods.decimals().call();
        } catch (err) {
            console.warn('Error getting decimals, using defaults:', err);
        }
        
        updateAllUI();
        
        contractInitialized = true;
        if (currentAccount) {
            await updateWalletInfo();
            updateBuyQuote();
            updateSellQuote();
            updateSwapQuote();
        }
        console.log('✅ Contracts initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing contracts:', error);
        showMessage('Error: ' + error.message, 'error');
        contractInitialized = false;
    }
}

// ============================================================
// 🔧 FIXED: sendTransaction with proper gas handling
// ============================================================
async function sendTransaction(method, params, actionName) {
    try {
        // Gas Estimate लें
        const gasEstimate = await method.estimateGas(params);
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2); // 20% extra
        
        console.log(`Gas Estimate: ${gasEstimate}, Gas Limit: ${gasLimit}`);
        
        // Transaction send करें
        const result = await method.send({
            ...params,
            gas: gasLimit
        });
        
        return result;
    } catch (error) {
        console.error(`${actionName} error:`, error);
        throw error;
    }
}

// ============================================================
// UI Update Function
// ============================================================
function updateAllUI() {
    const vntPriceEl = document.getElementById('vntPrice');
    const vnstPriceEl = document.getElementById('vnstPrice');
    const sellVNTPriceEl = document.getElementById('sellVNTPrice');
    const sellMinSwapEl = document.getElementById('sellMinSwap');
    const sellMaxSwapEl = document.getElementById('sellMaxSwap');
    const swapRateEl = document.getElementById('swapRate');
    const swapMinEl = document.getElementById('swapMin');
    const minVNTDisplay = document.getElementById('minVNTBuyDisplay');
    const minVNSTDisplay = document.getElementById('minVNSTBuyDisplay');
    
    if (vntPriceEl) vntPriceEl.textContent = formatUnits(vntPrice, 18, 4) + ' USDT';
    if (vnstPriceEl) vnstPriceEl.textContent = formatUnits(vnstPrice, 18, 4) + ' USDT';
    if (sellVNTPriceEl) sellVNTPriceEl.textContent = formatUnits(vntPrice, 18, 4) + ' USDT/VNT';
    if (sellMinSwapEl) sellMinSwapEl.textContent = formatUnits(minVNTBuyAmount, 18, 2) + ' VNT';
    if (sellMaxSwapEl) sellMaxSwapEl.textContent = formatUnits(maxVNTSaleAmount, 18, 2) + ' VNT';
    if (swapRateEl) swapRateEl.textContent = formatUnits(vntToVnstPrice, 18, 4) + ' VNST/VNT';
    if (swapMinEl) swapMinEl.textContent = formatUnits(minVNTSwapAmount, 18, 2) + ' VNT';
    if (minVNTDisplay) minVNTDisplay.textContent = formatUnits(minVNTBuyAmount, 18, 2) + ' VNT';
    if (minVNSTDisplay) minVNSTDisplay.textContent = formatUnits(minVNSTBuyAmount, 18, 2) + ' VNST';
}

// ============================================================
// updateBuyQuote
// ============================================================
async function updateBuyQuote() {
    if (!contractInitialized || !currentAccount) return;
    
    const tokenAmount = document.getElementById('tokenAmountBuy');
    const quoteResult = document.getElementById('buyQuoteResult');
    const quoteText = document.getElementById('buyQuoteText');
    const buyVNTBtn = document.getElementById('buyVNTBtn');
    const buyVNSTBtn = document.getElementById('buyVNSTBtn');
    
    if (!tokenAmount) return;
    
    const amount = tokenAmount.value;
    
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        if (quoteResult) quoteResult.classList.add('hidden');
        if (buyVNTBtn) buyVNTBtn.disabled = true;
        if (buyVNSTBtn) buyVNSTBtn.disabled = true;
        return;
    }
    
    try {
        const tokenBN = toTokenUnits(amount, 18);
        const minVNTBN = web3.utils.toBN(minVNTBuyAmount);
        const minVNSTBN = web3.utils.toBN(minVNSTBuyAmount);
        
        let vntValid = false;
        let vnstValid = false;
        let vntUsdtNeeded = '0';
        let vnstUsdtNeeded = '0';
        
        if (web3.utils.toBN(tokenBN).gte(minVNTBN)) {
            vntUsdtNeeded = web3.utils.toBN(tokenBN).mul(web3.utils.toBN(vntPrice)).div(web3.utils.toBN(10).pow(web3.utils.toBN(18))).toString();
            vntValid = true;
        }
        
        if (web3.utils.toBN(tokenBN).gte(minVNSTBN)) {
            vnstUsdtNeeded = web3.utils.toBN(tokenBN).mul(web3.utils.toBN(vnstPrice)).div(web3.utils.toBN(10).pow(web3.utils.toBN(18))).toString();
            vnstValid = true;
        }
        
        if (quoteResult) quoteResult.classList.remove('hidden');
        
        if (quoteText) {
            let displayText = '';
            let hasValidQuote = false;
            
            if (vntValid) {
                displayText += `🟡 VNT: ${amount} VNT = ${formatUnits(vntUsdtNeeded, 18)} USDT`;
                hasValidQuote = true;
            }
            
            if (vnstValid) {
                if (displayText) displayText += ' | ';
                displayText += `🔵 VNST: ${amount} VNST = ${formatUnits(vnstUsdtNeeded, 18)} USDT`;
                hasValidQuote = true;
            }
            
            if (!hasValidQuote) {
                displayText = `⚠️ Minimum: ${formatUnits(minVNTBN, 18)} VNT, ${formatUnits(minVNSTBN, 18)} VNST`;
            }
            
            quoteText.textContent = displayText;
        }
        
        if (buyVNTBtn) {
            buyVNTBtn.disabled = !vntValid;
            buyVNTBtn.style.opacity = vntValid ? '1' : '0.5';
        }
        
        if (buyVNSTBtn) {
            buyVNSTBtn.disabled = !vnstValid;
            buyVNSTBtn.style.opacity = vnstValid ? '1' : '0.5';
        }
        
    } catch (error) {
        console.error('Buy quote error:', error);
        if (quoteResult) quoteResult.classList.remove('hidden');
        if (quoteText) quoteText.textContent = 'Error calculating quote';
        if (buyVNTBtn) buyVNTBtn.disabled = true;
        if (buyVNSTBtn) buyVNSTBtn.disabled = true;
    }
}

// ============================================================
// updateSellQuote
// ============================================================
async function updateSellQuote() {
    if (!contractInitialized || !currentAccount) return;
    const vntAmount = document.getElementById('vntAmountSell').value;
    const quoteResult = document.getElementById('sellQuoteResult');
    const quoteText = document.getElementById('sellQuoteText');
    const sellVNTBtn = document.getElementById('sellVNTBtn');
    
    if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
        if (quoteResult) quoteResult.classList.add('hidden');
        if (sellVNTBtn) sellVNTBtn.disabled = true;
        return;
    }
    try {
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minVNTBuyAmount);
        const maxSwapBN = web3.utils.toBN(maxVNTSaleAmount);
        
        if (web3.utils.toBN(vntBN).lt(minSwapBN)) {
            if (quoteResult) quoteResult.classList.remove('hidden');
            if (quoteText) quoteText.textContent = `⚠️ Min: ${formatUnits(minVNTBuyAmount, 18)} VNT`;
            if (sellVNTBtn) sellVNTBtn.disabled = true;
            return;
        }
        
        if (web3.utils.toBN(vntBN).gt(maxSwapBN)) {
            if (quoteResult) quoteResult.classList.remove('hidden');
            if (quoteText) quoteText.textContent = `⚠️ Max: ${formatUnits(maxVNTSaleAmount, 18)} VNT`;
            if (sellVNTBtn) sellVNTBtn.disabled = true;
            return;
        }
        
        const usdtOut = await swapContract.methods.getSellVNTQuote(vntBN).call();
        if (quoteResult) quoteResult.classList.remove('hidden');
        if (quoteText) quoteText.textContent = `You will receive: ${formatUnits(usdtOut, usdtDecimals)} USDT`;
        if (sellVNTBtn) sellVNTBtn.disabled = false;
    } catch (error) {
        console.error('Sell quote error:', error);
        if (quoteResult) quoteResult.classList.remove('hidden');
        if (quoteText) quoteText.textContent = 'Error calculating quote';
        if (sellVNTBtn) sellVNTBtn.disabled = true;
    }
}

// ============================================================
// updateSwapQuote
// ============================================================
async function updateSwapQuote() {
    if (!contractInitialized || !currentAccount) return;
    const vntAmount = document.getElementById('vntAmountSwap').value;
    const quoteResult = document.getElementById('swapQuoteResult');
    const quoteText = document.getElementById('swapQuoteText');
    const swapBtn = document.getElementById('swapVNTToVNSTBtn');
    
    if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
        if (quoteResult) quoteResult.classList.add('hidden');
        if (swapBtn) swapBtn.disabled = true;
        return;
    }
    try {
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minVNTSwapAmount);
        if (web3.utils.toBN(vntBN).lt(minSwapBN)) {
            if (quoteResult) quoteResult.classList.remove('hidden');
            if (quoteText) quoteText.textContent = `⚠️ Min: ${formatUnits(minVNTSwapAmount, 18)} VNT`;
            if (swapBtn) swapBtn.disabled = true;
            return;
        }
        const vnstOut = await swapContract.methods.getSwapVNTQuote(vntBN).call();
        if (quoteResult) quoteResult.classList.remove('hidden');
        if (quoteText) quoteText.textContent = `You will receive: ${formatUnits(vnstOut, vnstDecimals)} VNST`;
        if (swapBtn) swapBtn.disabled = false;
    } catch (error) {
        console.error('Swap quote error:', error);
        if (quoteResult) quoteResult.classList.remove('hidden');
        if (quoteText) quoteText.textContent = 'Error calculating quote';
        if (swapBtn) swapBtn.disabled = true;
    }
}

// ============================================================
// Wallet Functions
// ============================================================
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
        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('disconnect', () => {
            currentAccount = null;
            updateUI();
            showMessage('Wallet disconnected', 'error');
        });
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        showMessage('Please install MetaMask', 'error');
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
            currentAccount = accounts[0];
            setupWalletEvents();
            await updateWalletInfo();
            showMessage('✅ Wallet connected successfully!', 'success');
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
        const walletInfo = document.getElementById('walletInfo');
        if (walletInfo) walletInfo.classList.add('hidden');
        return;
    }
    try {
        const vntBal = await vntToken.methods.balanceOf(currentAccount).call();
        const vnstBal = await vnstToken.methods.balanceOf(currentAccount).call();
        const usdtBal = await usdtToken.methods.balanceOf(currentAccount).call();
        
        const walletAddress = document.getElementById('walletAddress');
        const vntBalance = document.getElementById('vntBalance');
        const vnstBalance = document.getElementById('vnstBalance');
        const usdtBalance = document.getElementById('usdtBalance');
        const walletInfo = document.getElementById('walletInfo');
        
        if (walletAddress) walletAddress.textContent = shortenAddress(currentAccount);
        if (vntBalance) vntBalance.textContent = formatUnits(vntBal, vntDecimals);
        if (vnstBalance) vnstBalance.textContent = formatUnits(vnstBal, vnstDecimals);
        if (usdtBalance) usdtBalance.textContent = formatUnits(usdtBal, usdtDecimals);
        if (walletInfo) walletInfo.classList.remove('hidden');
    } catch (error) {
        console.error('Error updating wallet info:', error);
    }
}

function updateUI() {
    const isConnected = currentAccount !== null;
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    
    if (connectBtn) connectBtn.textContent = isConnected ? 'Connected' : 'Connect Wallet';
    if (walletInfo) walletInfo.classList.toggle('hidden', !isConnected);
}

// ============================================================
// Allowance Functions
// ============================================================
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
        const gasPrice = await getGasPrice();
        
        const gasEstimate = await token.methods.approve(spender, amount).estimateGas({
            from: currentAccount
        });
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        
        await token.methods.approve(spender, amount).send({
            from: currentAccount,
            gas: gasLimit,
            gasPrice: gasPrice
        });
        showMessage(`✅ ${tokenName} approved!`, 'success');
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

// ============================================================
// 🔧 FIXED: Buy Functions with proper gas
// ============================================================
async function buyVNT() {
    if (isProcessing) return;
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    
    isProcessing = true;
    try {
        const tokenAmount = document.getElementById('tokenAmountBuy').value;
        
        if (!tokenAmount || isNaN(tokenAmount) || Number(tokenAmount) <= 0) {
            showMessage('Enter valid token amount', 'error');
            isProcessing = false;
            return;
        }
        
        const tokenBN = toTokenUnits(tokenAmount, 18);
        const minVNTBN = web3.utils.toBN(minVNTBuyAmount);
        
        if (web3.utils.toBN(tokenBN).lt(minVNTBN)) {
            showMessage(`Minimum: ${formatUnits(minVNTBuyAmount, 18)} VNT`, 'error');
            isProcessing = false;
            return;
        }
        
        const usdtNeeded = web3.utils.toBN(tokenBN).mul(web3.utils.toBN(vntPrice)).div(web3.utils.toBN(10).pow(web3.utils.toBN(18))).toString();
        
        const hasAllowance = await checkAllowance(usdtToken, currentAccount, CONFIG[NETWORK].swapContractAddress, usdtNeeded);
        if (!hasAllowance) {
            const approved = await approveToken(usdtToken, CONFIG[NETWORK].swapContractAddress, usdtNeeded, 'USDT');
            if (!approved) {
                isProcessing = false;
                return;
            }
        }

        showMessage(`🔄 Buying ${tokenAmount} VNT...`, 'status');
        const gasPrice = await getGasPrice();

        // 🔧 FIXED: Gas Estimate with proper method
        const method = swapContract.methods.buyVNT(usdtNeeded);
        const params = {
            from: currentAccount,
            value: swapFeeBNB
        };
        
        const gasEstimate = await method.estimateGas(params);
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        
        await method.send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: gasLimit,
            gasPrice: gasPrice
        });
        
        showMessage(`✅ ${tokenAmount} VNT purchased successfully!`, 'success');
        await updateWalletInfo();
        updateBuyQuote();
        
    } catch (error) {
        console.error('Buy VNT error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Failed: ${error.message}`, 'error');
        }
    }
    isProcessing = false;
}

async function buyVNST() {
    if (isProcessing) return;
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    
    isProcessing = true;
    try {
        const tokenAmount = document.getElementById('tokenAmountBuy').value;
        
        if (!tokenAmount || isNaN(tokenAmount) || Number(tokenAmount) <= 0) {
            showMessage('Enter valid token amount', 'error');
            isProcessing = false;
            return;
        }
        
        const tokenBN = toTokenUnits(tokenAmount, 18);
        const minVNSTBN = web3.utils.toBN(minVNSTBuyAmount);
        
        if (web3.utils.toBN(tokenBN).lt(minVNSTBN)) {
            showMessage(`Minimum: ${formatUnits(minVNSTBuyAmount, 18)} VNST`, 'error');
            isProcessing = false;
            return;
        }
        
        const usdtNeeded = web3.utils.toBN(tokenBN).mul(web3.utils.toBN(vnstPrice)).div(web3.utils.toBN(10).pow(web3.utils.toBN(18))).toString();

        const hasAllowance = await checkAllowance(usdtToken, currentAccount, CONFIG[NETWORK].swapContractAddress, usdtNeeded);
        if (!hasAllowance) {
            const approved = await approveToken(usdtToken, CONFIG[NETWORK].swapContractAddress, usdtNeeded, 'USDT');
            if (!approved) {
                isProcessing = false;
                return;
            }
        }

        showMessage(`🔄 Buying ${tokenAmount} VNST...`, 'status');
        const gasPrice = await getGasPrice();

        const method = swapContract.methods.buyVNST(usdtNeeded);
        const params = {
            from: currentAccount,
            value: swapFeeBNB
        };
        
        const gasEstimate = await method.estimateGas(params);
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        
        await method.send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: gasLimit,
            gasPrice: gasPrice
        });
        
        showMessage(`✅ ${tokenAmount} VNST purchased successfully!`, 'success');
        await updateWalletInfo();
        updateBuyQuote();
        
    } catch (error) {
        console.error('Buy VNST error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Failed: ${error.message}`, 'error');
        }
    }
    isProcessing = false;
}

// ============================================================
// 🔧 FIXED: Sell Function with proper gas
// ============================================================
async function sellVNT() {
    if (isProcessing) return;
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    
    isProcessing = true;
    try {
        const vntAmount = document.getElementById('vntAmountSell').value;
        if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
            showMessage('Enter valid VNT amount', 'error');
            isProcessing = false;
            return;
        }
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minVNTBuyAmount);
        const maxSwapBN = web3.utils.toBN(maxVNTSaleAmount);
        
        if (web3.utils.toBN(vntBN).lt(minSwapBN)) {
            showMessage(`Minimum: ${formatUnits(minVNTBuyAmount, 18)} VNT`, 'error');
            isProcessing = false;
            return;
        }
        
        if (web3.utils.toBN(vntBN).gt(maxSwapBN)) {
            showMessage(`Maximum: ${formatUnits(maxVNTSaleAmount, 18)} VNT`, 'error');
            isProcessing = false;
            return;
        }

        const hasAllowance = await checkAllowance(vntToken, currentAccount, CONFIG[NETWORK].swapContractAddress, vntBN);
        if (!hasAllowance) {
            const approved = await approveToken(vntToken, CONFIG[NETWORK].swapContractAddress, vntBN, 'VNT');
            if (!approved) {
                isProcessing = false;
                return;
            }
        }

        showMessage('🔄 Selling VNT...', 'status');
        const gasPrice = await getGasPrice();

        const method = swapContract.methods.sellVNT(vntBN);
        const params = {
            from: currentAccount,
            value: swapFeeBNB
        };
        
        const gasEstimate = await method.estimateGas(params);
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        
        await method.send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: gasLimit,
            gasPrice: gasPrice
        });
        
        showMessage('✅ VNT sold successfully!', 'success');
        await updateWalletInfo();
        updateSellQuote();
        
    } catch (error) {
        console.error('Sell VNT error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Failed: ${error.message}`, 'error');
        }
    }
    isProcessing = false;
}

// ============================================================
// 🔧 FIXED: Swap Function with proper gas
// ============================================================
async function swapVNTToVNST() {
    if (isProcessing) return;
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    
    isProcessing = true;
    try {
        const vntAmount = document.getElementById('vntAmountSwap').value;
        if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
            showMessage('Enter valid VNT amount', 'error');
            isProcessing = false;
            return;
        }
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minVNTSwapAmount);
        if (web3.utils.toBN(vntBN).lt(minSwapBN)) {
            showMessage(`Minimum: ${formatUnits(minVNTSwapAmount, 18)} VNT`, 'error');
            isProcessing = false;
            return;
        }

        const hasAllowance = await checkAllowance(vntToken, currentAccount, CONFIG[NETWORK].swapContractAddress, vntBN);
        if (!hasAllowance) {
            const approved = await approveToken(vntToken, CONFIG[NETWORK].swapContractAddress, vntBN, 'VNT');
            if (!approved) {
                isProcessing = false;
                return;
            }
        }

        showMessage('🔄 Swapping VNT → VNST...', 'status');
        const gasPrice = await getGasPrice();

        const method = swapContract.methods.swapVNTToVNST(vntBN);
        const params = {
            from: currentAccount,
            value: swapFeeBNB
        };
        
        const gasEstimate = await method.estimateGas(params);
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        
        await method.send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: gasLimit,
            gasPrice: gasPrice
        });
        
        showMessage('✅ Swap successful!', 'success');
        await updateWalletInfo();
        updateSwapQuote();
        
    } catch (error) {
        console.error('Swap error:', error);
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Failed: ${error.message}`, 'error');
        }
    }
    isProcessing = false;
}

// ============================================================
// Setup Functions
// ============================================================
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
    const buyVNTBtn = document.getElementById('buyVNTBtn');
    const buyVNSTBtn = document.getElementById('buyVNSTBtn');
    const sellVNTBtn = document.getElementById('sellVNTBtn');
    const swapBtn = document.getElementById('swapVNTToVNSTBtn');
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (buyVNTBtn) buyVNTBtn.addEventListener('click', buyVNT);
    if (buyVNSTBtn) buyVNSTBtn.addEventListener('click', buyVNST);
    if (sellVNTBtn) sellVNTBtn.addEventListener('click', sellVNT);
    if (swapBtn) swapBtn.addEventListener('click', swapVNTToVNST);
}

function setupInputListeners() {
    const tokenInput = document.getElementById('tokenAmountBuy');
    const vntSellInput = document.getElementById('vntAmountSell');
    const vntSwapInput = document.getElementById('vntAmountSwap');
    
    if (tokenInput) tokenInput.addEventListener('input', updateBuyQuote);
    if (vntSellInput) vntSellInput.addEventListener('input', updateSellQuote);
    if (vntSwapInput) vntSwapInput.addEventListener('input', updateSwapQuote);
}

// ============================================================
// Mobile Auto-Scroll Prevention
// ============================================================
(function preventAutoScroll() {
    window.addEventListener('load', function() {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        setTimeout(function() {
            document.documentElement.style.scrollBehavior = '';
            document.body.classList.add('loaded');
        }, 100);
    });
    
    let isInitializing = true;
    setTimeout(function() {
        isInitializing = false;
    }, 500);
    
    window.addEventListener('scroll', function(e) {
        if (isInitializing) {
            window.scrollTo(0, 0);
        }
    }, { passive: true });
})();

// ============================================================
// Initialize
// ============================================================
window.addEventListener('load', async () => {
    try {
        console.log('🔄 VirsenSwap UI initializing on mainnet...');
        await setupEventListeners();
        await checkWalletConnection();
        await initContracts();
        setupInputListeners();
        setupTabSystem();
        updateUI();
        console.log('✅ VirsenSwap UI initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showMessage('Failed to initialize: ' + error.message, 'error');
    }
});

// ============================================================
// Debug Functions
// ============================================================
async function checkContractStatus() {
    try {
        console.log('===== 📊 CONTRACT STATUS CHECK =====');
        console.log('Min VNT Buy:', formatUnits(minVNTBuyAmount, 18, 2));
        console.log('Max VNT Sale:', formatUnits(maxVNTSaleAmount, 18, 2));
        console.log('Min VNST Buy:', formatUnits(minVNSTBuyAmount, 18, 2));
        console.log('Min VNT Swap:', formatUnits(minVNTSwapAmount, 18, 2));
        console.log('VNT Price:', formatUnits(vntPrice, 18, 4));
        console.log('VNST Price:', formatUnits(vnstPrice, 18, 4));
        console.log('===== END CHECK =====');
        showMessage('✅ Contract status checked - see console', 'success');
    } catch (error) {
        console.error('Status check error:', error);
        showMessage('Error checking contract status', 'error');
    }
}

async function approveUSDT() {
    try {
        const amount = web3.utils.toBN(1000000).mul(web3.utils.toBN(10).pow(web3.utils.toBN(usdtDecimals))).toString();
        const gasPrice = await getGasPrice();
        await usdtToken.methods.approve(CONFIG[NETWORK].swapContractAddress, amount).send({
            from: currentAccount,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        showMessage('✅ USDT approved successfully!', 'success');
    } catch (error) {
        showMessage('Failed to approve USDT', 'error');
    }
}

async function approveVNT() {
    try {
        const amount = web3.utils.toBN(10000).mul(web3.utils.toBN(10).pow(web3.utils.toBN(vntDecimals))).toString();
        const gasPrice = await getGasPrice();
        await vntToken.methods.approve(CONFIG[NETWORK].swapContractAddress, amount).send({
            from: currentAccount,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        showMessage('✅ VNT approved successfully!', 'success');
    } catch (error) {
        showMessage('Failed to approve VNT', 'error');
    }
}

async function completeFix() {
    try {
        await approveUSDT();
        await approveVNT();
        showMessage('✅ All approvals done!', 'success');
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
    }
}

window.checkContractStatus = checkContractStatus;
window.approveUSDT = approveUSDT;
window.approveVNT = approveVNT;
window.completeFix = completeFix;

console.log('✅ All debug functions loaded!');
