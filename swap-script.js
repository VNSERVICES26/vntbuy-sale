const CONFIG = {
    mainnet: {
        swapContractAddress: "YOUR_MAINNET_SWAP_CONTRACT",
        vntTokenAddress: "YOUR_MAINNET_VNT_TOKEN",
        vnstTokenAddress: "YOUR_MAINNET_VNST_TOKEN",
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
let maxVNTBuyAmount = 0;
let minSwapAmount = 0, swapFeeBNB = 0, vntPrice = 0, vnstPrice = 0, vntToVnstPrice = 0;
let contractInitialized = false;

// Gas Settings
const GAS_LIMIT = 500000;

async function getGasPrice() {
    return await web3.eth.getGasPrice();
}

const SWAP_ABI = [
    {
        "inputs": [
            {"internalType":"address","name":"_vnt","type":"address"},
            {"internalType":"address","name":"_vnst","type":"address"},
            {"internalType":"address","name":"_usdt","type":"address"},
            {"internalType":"address payable","name":"_feeWallet","type":"address"},
            {"internalType":"address","name":"_vntTreasury","type":"address"},
            {"internalType":"address","name":"_vnstTreasury","type":"address"},
            {"internalType":"address","name":"_usdtTreasury","type":"address"},
            {"internalType":"uint256","name":"_vntPrice","type":"uint256"},
            {"internalType":"uint256","name":"_vnstPrice","type":"uint256"},
            {"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"},
            {"internalType":"uint256","name":"_swapFeeBNB","type":"uint256"}
        ],
        "stateMutability":"nonpayable",
        "type":"constructor"
    },
    {"inputs":[],"name":"AlreadyPaused","type":"error"},
    {"inputs":[],"name":"AmountTooSmall","type":"error"},
    {"inputs":[],"name":"ContractPaused","type":"error"},
    {"inputs":[],"name":"FeeMismatch","type":"error"},
    {"inputs":[],"name":"InsufficientAllowance","type":"error"},
    {"inputs":[],"name":"InsufficientBalance","type":"error"},
    {"inputs":[],"name":"InvalidAddress","type":"error"},
    {"inputs":[],"name":"InvalidAmount","type":"error"},
    {"inputs":[],"name":"InvalidFee","type":"error"},
    {"inputs":[],"name":"InvalidToken","type":"error"},
    {"inputs":[],"name":"MinSwapNotMet","type":"error"},
    {"inputs":[],"name":"NotOwner","type":"error"},
    {"inputs":[],"name":"NotPaused","type":"error"},
    {"inputs":[],"name":"ReentrancyGuard","type":"error"},
    {"inputs":[],"name":"SlippageExceeded","type":"error"},
    {"inputs":[],"name":"TransferFailed","type":"error"},
    {"inputs":[],"name":"ZeroMinSwap","type":"error"},
    {"inputs":[],"name":"ZeroPrice","type":"error"},
    {
        "anonymous":false,
        "inputs":[{"indexed":false,"internalType":"address","name":"oldWallet","type":"address"},{"indexed":false,"internalType":"address","name":"newWallet","type":"address"}],
        "name":"FeeWalletUpdated","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":false,"internalType":"uint256","name":"oldMax","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newMax","type":"uint256"}],
        "name":"MaxSwapUpdated","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":false,"internalType":"uint256","name":"oldMin","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newMin","type":"uint256"}],
        "name":"MinSwapUpdated","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],
        "name":"OwnershipTransferred","type":"event"
    },
    {"anonymous":false,"inputs":[],"name":"Paused","type":"event"},
    {
        "anonymous":false,
        "inputs":[{"indexed":false,"internalType":"string","name":"pair","type":"string"},{"indexed":false,"internalType":"uint256","name":"oldPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],
        "name":"PriceUpdated","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"fromToken","type":"address"},{"indexed":false,"internalType":"address","name":"toToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minAmountOut","type":"uint256"}],
        "name":"SwapExecuted","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":false,"internalType":"uint256","name":"oldFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],
        "name":"SwapFeeUpdated","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":false,"internalType":"string","name":"treasury","type":"string"},{"indexed":false,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":false,"internalType":"address","name":"newAddress","type":"address"}],
        "name":"TreasuryUpdated","type":"event"
    },
    {"anonymous":false,"inputs":[],"name":"Unpaused","type":"event"},
    {
        "anonymous":false,
        "inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vnstReceived","type":"uint256"}],
        "name":"VNSTPurchased","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vntReceived","type":"uint256"}],
        "name":"VNTPurchased","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntSold","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdtReceived","type":"uint256"}],
        "name":"VNTSold","type":"event"
    },
    {
        "anonymous":false,
        "inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vnstReceived","type":"uint256"}],
        "name":"VNTSwapped","type":"event"
    },
    {"stateMutability":"payable","type":"fallback"},
    {"inputs":[],"name":"USDT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"VNST","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"VNT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"internalType":"uint256","name":"minVnstOut","type":"uint256"}],"name":"buyVNST","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"internalType":"uint256","name":"minVntOut","type":"uint256"}],"name":"buyVNT","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"emergencyWithdrawAllBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdrawBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"feeWallet","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getBNBBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {
        "inputs":[],
        "name":"getContractInfo",
        "outputs":[
            {"internalType":"address","name":"_owner","type":"address"},
            {"internalType":"bool","name":"_paused","type":"bool"},
            {"internalType":"uint256","name":"_minVNTBuy","type":"uint256"},
            {"internalType":"uint256","name":"_maxVNTBuy","type":"uint256"},
            {"internalType":"uint256","name":"_minVNSTBuy","type":"uint256"},
            {"internalType":"uint256","name":"_minVNTSwap","type":"uint256"},
            {"internalType":"uint256","name":"_fee","type":"uint256"},
            {"internalType":"uint256","name":"_vntPrice","type":"uint256"},
            {"internalType":"uint256","name":"_vnstPrice","type":"uint256"},
            {"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"},
            {"internalType":"uint256","name":"_totalSwapped","type":"uint256"}
        ],
        "stateMutability":"view",
        "type":"function"
    },
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSellVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSwapVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getTreasuryBalances","outputs":[{"internalType":"uint256","name":"vntBal","type":"uint256"},{"internalType":"uint256","name":"vnstBal","type":"uint256"},{"internalType":"uint256","name":"usdtBal","type":"uint256"},{"internalType":"uint256","name":"bnbBal","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserAllowances","outputs":[{"internalType":"uint256","name":"vnt","type":"uint256"},{"internalType":"uint256","name":"vnst","type":"uint256"},{"internalType":"uint256","name":"usdt","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserTotalSwaps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNSTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"maxVNTBuyAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"minSwapAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"},{"internalType":"uint256","name":"minUsdtOut","type":"uint256"}],"name":"sellVNT","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"}],"name":"setAllPrices","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_vnt","type":"address"},{"internalType":"address","name":"_vnst","type":"address"},{"internalType":"address","name":"_usdt","type":"address"}],"name":"setAllTreasuries","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address payable","name":"newWallet","type":"address"}],"name":"setFeeWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newMax","type":"uint256"}],"name":"setMaxVNTBuy","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newMin","type":"uint256"}],"name":"setMinSwap","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"setSwapFee","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setUSDTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNSTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setVNSTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNTToVNSTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setVNTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"swapFeeBNB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"},{"internalType":"uint256","name":"minVnstOut","type":"uint256"}],"name":"swapVNTToVNST","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[],"name":"totalSwapped","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"usdtTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userSwaps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vnstTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vntPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vntToVnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"vntTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"stateMutability":"payable","type":"receive"}
];

const TOKEN_ABI = [
    {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
];

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
        console.log('📝 Available debug commands:');
        console.log('  - checkContractStatus()');
        console.log('  - detailedDebug()');
        console.log('  - approveUSDT()');
        console.log('  - approveVNT()');
        console.log('  - completeFix()');
        console.log('  - checkAllowances()');
        console.log('  - testBuyVNST()');
    } catch (error) {
        console.error('❌ Initialization error:', error);
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
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    document.getElementById('buyVNTBtn').addEventListener('click', () => buyVNT());
    document.getElementById('buyVNSTBtn').addEventListener('click', () => buyVNST());
    document.getElementById('sellVNTBtn').addEventListener('click', () => sellVNT());
    document.getElementById('swapVNTToVNSTBtn').addEventListener('click', () => swapVNTToVNST()); 
}

function setupInputListeners() {
    document.getElementById('usdtAmountBuy').addEventListener('input', updateBuyQuote);
    document.getElementById('vntAmountSell').addEventListener('input', updateSellQuote);
    document.getElementById('vntAmountSwap').addEventListener('input', updateSwapQuote);
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
        if (fraction.length > decimals) fraction = fraction.substring(0, decimals);
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
            try { bnValue = BN(value.toString()); } catch (e) { return String(value); }
        } else { return '0'; }
        const base = BN(10).pow(BN(decimals));
        const whole = bnValue.div(base).toString();
        let fractionBN = bnValue.mod(base).toString().padStart(decimals, '0');
        if (Number(fractionBN) === 0) return Number(whole).toLocaleString();
        fractionBN = fractionBN.substring(0, maxFractionDigits);
        fractionBN = fractionBN.replace(/0+$/, '');
        if (fractionBN === '') return Number(whole).toLocaleString();
        return `${Number(whole).toLocaleString()}.${fractionBN}`;
    } catch (error) {
        console.error('formatUnits error:', error);
        return String(value || '0');
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
    } catch (error) {
        console.error('Error updating wallet info:', error);
    }
}

function updateUI() {
    const isConnected = currentAccount !== null;
    document.getElementById('connectWalletBtn').textContent = isConnected ? 'Connected' : 'Connect Wallet';
    document.getElementById('walletInfo').classList.toggle('hidden', !isConnected);
}

async function initContracts() {
    try {
        const config = CONFIG[NETWORK];
        console.log(`Initializing contracts on mainnet at:`, config.swapContractAddress);
        
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
        } else {
            web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl));
        }
        
        swapContract = new web3.eth.Contract(SWAP_ABI, config.swapContractAddress);
        vntToken = new web3.eth.Contract(TOKEN_ABI, config.vntTokenAddress);
        vnstToken = new web3.eth.Contract(TOKEN_ABI, config.vnstTokenAddress);
        usdtToken = new web3.eth.Contract(TOKEN_ABI, config.usdtTokenAddress);
        
        try {
            const info = await swapContract.methods.getContractInfo().call();
            minVNTBuyAmount = info._minVNTBuy;
            maxVNTBuyAmount = info._maxVNTBuy;
            minVNSTBuyAmount = info._minVNSTBuy;
            minVNTSwapAmount = info._minVNTSwap;
            minSwapAmount = info._minVNTBuy;
            swapFeeBNB = info._fee;
            vntPrice = info._vntPrice;
            vnstPrice = info._vnstPrice;
            vntToVnstPrice = info._vntToVnstPrice;
            console.log('✅ Contract info loaded successfully');
            console.log('Min VNT Buy:', minVNTBuyAmount.toString());
            console.log('Max VNT Buy:', maxVNTBuyAmount.toString());
            console.log('Min VNST Buy:', minVNSTBuyAmount.toString());
            console.log('Min VNT Swap:', minVNTSwapAmount.toString());
        } catch (err) {
            console.warn('Error getting contract info, trying individual calls:', err);
            vntPrice = await swapContract.methods.vntPrice().call();
            vnstPrice = await swapContract.methods.vnstPrice().call();
            vntToVnstPrice = await swapContract.methods.vntToVnstPrice().call();
            minVNTBuyAmount = await swapContract.methods.minVNTBuyAmount().call();
            maxVNTBuyAmount = await swapContract.methods.maxVNTBuyAmount().call();
            minVNSTBuyAmount = await swapContract.methods.minVNSTBuyAmount().call();
            minVNTSwapAmount = await swapContract.methods.minVNTSwapAmount().call();
            minSwapAmount = minVNTBuyAmount;
            swapFeeBNB = await swapContract.methods.swapFeeBNB().call();
        }
        
        try {
            vntDecimals = await vntToken.methods.decimals().call();
            vnstDecimals = await vnstToken.methods.decimals().call();
            usdtDecimals = await usdtToken.methods.decimals().call();
        } catch (err) {
            console.warn('Error getting decimals, using defaults:', err);
        }
        
        document.getElementById('vntPrice').textContent = formatUnits(vntPrice, 18) + ' USDT';
        document.getElementById('vnstPrice').textContent = formatUnits(vnstPrice, 18) + ' USDT';
        document.getElementById('minSwapAmount').textContent = formatUnits(minVNTBuyAmount, 18) + ' USDT/VNT';
        document.getElementById('sellVNTPrice').textContent = formatUnits(vntPrice, 18) + ' USDT/VNT';
        document.getElementById('sellMinSwap').textContent = formatUnits(minVNTBuyAmount, 18) + ' VNT';
        document.getElementById('sellMaxSwap').textContent = formatUnits(maxVNTBuyAmount, 18) + ' VNT';
        document.getElementById('swapRate').textContent = formatUnits(vntToVnstPrice, 18) + ' VNST/VNT';
        document.getElementById('swapMin').textContent = formatUnits(minVNTSwapAmount, 18) + ' VNT';
        
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
        const minSwapBN = web3.utils.toBN(minVNTBuyAmount);
        if (usdtBN.lt(minSwapBN)) {
            quoteResult.classList.remove('hidden');
            quoteText.textContent = `⚠️ Min: ${formatUnits(minVNTBuyAmount, 18)} USDT`;
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
        const minSwapBN = web3.utils.toBN(minVNTBuyAmount);
        const maxSwapBN = web3.utils.toBN(maxVNTBuyAmount);
        
        if (vntBN.lt(minSwapBN)) {
            quoteResult.classList.remove('hidden');
            quoteText.textContent = `⚠️ Min: ${formatUnits(minVNTBuyAmount, 18)} VNT`;
            document.getElementById('sellVNTBtn').disabled = true;
            return;
        }
        
        if (vntBN.gt(maxSwapBN)) {
            quoteResult.classList.remove('hidden');
            quoteText.textContent = `⚠️ Max: ${formatUnits(maxVNTBuyAmount, 18)} VNT`;
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
        const minSwapBN = web3.utils.toBN(minVNTSwapAmount);
        if (vntBN.lt(minSwapBN)) {
            quoteResult.classList.remove('hidden');
            quoteText.textContent = `⚠️ Min: ${formatUnits(minVNTSwapAmount, 18)} VNT`;
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
        const gasPrice = await getGasPrice();

        const result = await token.methods.approve(spender, amount).send({
            from: currentAccount,
            gas: GAS_LIMIT,
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

async function buyVNT() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    try {
        const usdtAmount = document.getElementById('usdtAmountBuy').value;
        if (!usdtAmount || isNaN(usdtAmount) || Number(usdtAmount) <= 0) {
            showMessage('Enter valid USDT amount', 'error');
            return;
        }
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        const minSwapBN = web3.utils.toBN(minVNTBuyAmount);
        if (usdtBN.lt(minSwapBN)) {
            showMessage(`Minimum: ${formatUnits(minVNTBuyAmount, 18)} USDT`, 'error');
            return;
        }

        const hasAllowance = await checkAllowance(usdtToken, currentAccount, CONFIG[NETWORK].swapContractAddress, usdtBN);
        if (!hasAllowance) {
            const approved = await approveToken(usdtToken, CONFIG[NETWORK].swapContractAddress, usdtBN.toString(), 'USDT');
            if (!approved) return;
        }

        const vntQuote = await swapContract.methods.getVNTQuote(usdtBN.toString()).call();
        const minOut = web3.utils.toBN(vntQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('🔄 Buying VNT...', 'status');
        const gasPrice = await getGasPrice();

        const result = await swapContract.methods.buyVNT(usdtBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        showMessage('✅ VNT purchased successfully!', 'success');
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
}

async function buyVNST() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    try {
        const usdtAmount = document.getElementById('usdtAmountBuy').value;
        if (!usdtAmount || isNaN(usdtAmount) || Number(usdtAmount) <= 0) {
            showMessage('Enter valid USDT amount', 'error');
            return;
        }
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        const minSwapBN = web3.utils.toBN(minVNSTBuyAmount);
        if (usdtBN.lt(minSwapBN)) {
            showMessage(`Minimum: ${formatUnits(minVNSTBuyAmount, 18)} USDT`, 'error');
            return;
        }

        const hasAllowance = await checkAllowance(usdtToken, currentAccount, CONFIG[NETWORK].swapContractAddress, usdtBN);
        if (!hasAllowance) {
            const approved = await approveToken(usdtToken, CONFIG[NETWORK].swapContractAddress, usdtBN.toString(), 'USDT');
            if (!approved) return;
        }

        const vnstQuote = await swapContract.methods.getVNSTQuote(usdtBN.toString()).call();
        const minOut = web3.utils.toBN(vnstQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('🔄 Buying VNST...', 'status');
        const gasPrice = await getGasPrice();

        const result = await swapContract.methods.buyVNST(usdtBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        showMessage('✅ VNST purchased successfully!', 'success');
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
}

async function sellVNT() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    try {
        const vntAmount = document.getElementById('vntAmountSell').value;
        if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
            showMessage('Enter valid VNT amount', 'error');
            return;
        }
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minVNTBuyAmount);
        const maxSwapBN = web3.utils.toBN(maxVNTBuyAmount);
        
        if (vntBN.lt(minSwapBN)) {
            showMessage(`Minimum: ${formatUnits(minVNTBuyAmount, 18)} VNT`, 'error');
            return;
        }
        
        if (vntBN.gt(maxSwapBN)) {
            showMessage(`Maximum: ${formatUnits(maxVNTBuyAmount, 18)} VNT`, 'error');
            return;
        }

        const hasAllowance = await checkAllowance(vntToken, currentAccount, CONFIG[NETWORK].swapContractAddress, vntBN);
        if (!hasAllowance) {
            const approved = await approveToken(vntToken, CONFIG[NETWORK].swapContractAddress, vntBN.toString(), 'VNT');
            if (!approved) return;
        }

        const usdtQuote = await swapContract.methods.getSellVNTQuote(vntBN.toString()).call();
        const minOut = web3.utils.toBN(usdtQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('🔄 Selling VNT...', 'status');
        const gasPrice = await getGasPrice();

        const result = await swapContract.methods.sellVNT(vntBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: GAS_LIMIT,
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
}

async function swapVNTToVNST() {
    if (!contractInitialized || !currentAccount) {
        showMessage('Please connect wallet first', 'error');
        return;
    }
    try {
        const vntAmount = document.getElementById('vntAmountSwap').value;
        if (!vntAmount || isNaN(vntAmount) || Number(vntAmount) <= 0) {
            showMessage('Enter valid VNT amount', 'error');
            return;
        }
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        const minSwapBN = web3.utils.toBN(minVNTSwapAmount);
        if (vntBN.lt(minSwapBN)) {
            showMessage(`Minimum: ${formatUnits(minVNTSwapAmount, 18)} VNT`, 'error');
            return;
        }

        const hasAllowance = await checkAllowance(vntToken, currentAccount, CONFIG[NETWORK].swapContractAddress, vntBN);
        if (!hasAllowance) {
            const approved = await approveToken(vntToken, CONFIG[NETWORK].swapContractAddress, vntBN.toString(), 'VNT');
            if (!approved) return;
        }

        const vnstQuote = await swapContract.methods.getSwapVNTQuote(vntBN.toString()).call();
        const minOut = web3.utils.toBN(vnstQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        showMessage('🔄 Swapping VNT → VNST...', 'status');
        const gasPrice = await getGasPrice();

        const result = await swapContract.methods.swapVNTToVNST(vntBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: GAS_LIMIT,
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
}

async function checkContractStatus() {
    try {
        console.log('===== 📊 CONTRACT STATUS CHECK =====');
        
        const isPaused = await swapContract.methods.paused().call();
        console.log('Paused:', isPaused);
        
        console.log('Min VNT Buy:', formatUnits(minVNTBuyAmount, 18));
        console.log('Max VNT Buy:', formatUnits(maxVNTBuyAmount, 18));
        console.log('Min VNST Buy:', formatUnits(minVNSTBuyAmount, 18));
        console.log('Min VNT Swap:', formatUnits(minVNTSwapAmount, 18));
        
        const usdtBal = await usdtToken.methods.balanceOf(currentAccount).call();
        const vntBal = await vntToken.methods.balanceOf(currentAccount).call();
        const vnstBal = await vnstToken.methods.balanceOf(currentAccount).call();
        
        console.log('Your USDT Balance:', formatUnits(usdtBal, usdtDecimals));
        console.log('Your VNT Balance:', formatUnits(vntBal, vntDecimals));
        console.log('Your VNST Balance:', formatUnits(vnstBal, vnstDecimals));
        
        const vntTreasury = await swapContract.methods.vntTreasury().call();
        const vnstTreasury = await swapContract.methods.vnstTreasury().call();
        const usdtTreasury = await swapContract.methods.usdtTreasury().call();
        
        const vntTreasuryBal = await vntToken.methods.balanceOf(vntTreasury).call();
        const vnstTreasuryBal = await vnstToken.methods.balanceOf(vnstTreasury).call();
        const usdtTreasuryBal = await usdtToken.methods.balanceOf(usdtTreasury).call();
        
        console.log('VNT Treasury Balance:', formatUnits(vntTreasuryBal, vntDecimals));
        console.log('VNST Treasury Balance:', formatUnits(vnstTreasuryBal, vnstDecimals));
        console.log('USDT Treasury Balance:', formatUnits(usdtTreasuryBal, usdtDecimals));
        
        console.log('VNT Price:', formatUnits(vntPrice, 18));
        console.log('VNST Price:', formatUnits(vnstPrice, 18));
        console.log('VNT→VNST Price:', formatUnits(vntToVnstPrice, 18));
        
        console.log('===== END CHECK =====');
        
        let msg = `📊 Balances:\n`;
        msg += `USDT: ${formatUnits(usdtBal, usdtDecimals)}\n`;
        msg += `VNT: ${formatUnits(vntBal, vntDecimals)}\n`;
        msg += `VNST: ${formatUnits(vnstBal, vnstDecimals)}\n`;
        msg += `Min VNT Buy: ${formatUnits(minVNTBuyAmount, 18)}\n`;
        msg += `Max VNT Buy: ${formatUnits(maxVNTBuyAmount, 18)}`;
        
        showMessage(msg, 'status');
        
        return {
            usdtBalance: usdtBal,
            vntBalance: vntBal,
            vnstBalance: vnstBal,
            minVNTBuy: minVNTBuyAmount,
            maxVNTBuy: maxVNTBuyAmount,
            minVNSTBuy: minVNSTBuyAmount,
            minVNTSwap: minVNTSwapAmount,
            paused: isPaused,
            vntTreasury: vntTreasuryBal,
            vnstTreasury: vnstTreasuryBal,
            usdtTreasury: usdtTreasuryBal
        };
    } catch (error) {
        console.error('Status check error:', error);
        showMessage('Error checking contract status: ' + error.message, 'error');
    }
}

async function detailedDebug() {
    try {
        console.log('===== 🔍 DETAILED DEBUG START =====');
        console.log('Account:', currentAccount);
        console.log('Contract:', CONFIG[NETWORK].swapContractAddress);
        
        const usdtBal = await usdtToken.methods.balanceOf(currentAccount).call();
        const vntBal = await vntToken.methods.balanceOf(currentAccount).call();
        const vnstBal = await vnstToken.methods.balanceOf(currentAccount).call();
        const bnbBal = await web3.eth.getBalance(currentAccount);
        
        console.log('📊 YOUR BALANCES:');
        console.log('  USDT:', formatUnits(usdtBal, usdtDecimals));
        console.log('  VNT:', formatUnits(vntBal, vntDecimals));
        console.log('  VNST:', formatUnits(vnstBal, vnstDecimals));
        console.log('  BNB:', formatUnits(bnbBal, 18));
        
        const paused = await swapContract.methods.paused().call();
        console.log('📋 CONTRACT INFO:');
        console.log('  Paused:', paused);
        console.log('  Min VNT Buy:', formatUnits(minVNTBuyAmount, 18));
        console.log('  Max VNT Buy:', formatUnits(maxVNTBuyAmount, 18));
        console.log('  Min VNST Buy:', formatUnits(minVNSTBuyAmount, 18));
        console.log('  Min VNT Swap:', formatUnits(minVNTSwapAmount, 18));
        
        const vntTreasury = await swapContract.methods.vntTreasury().call();
        const vnstTreasury = await swapContract.methods.vnstTreasury().call();
        const usdtTreasury = await swapContract.methods.usdtTreasury().call();
        
        const vntTreasuryBal = await vntToken.methods.balanceOf(vntTreasury).call();
        const vnstTreasuryBal = await vnstToken.methods.balanceOf(vnstTreasury).call();
        const usdtTreasuryBal = await usdtToken.methods.balanceOf(usdtTreasury).call();
        
        console.log('🏦 TREASURY BALANCES:');
        console.log('  VNT Treasury:', formatUnits(vntTreasuryBal, vntDecimals));
        console.log('  VNST Treasury:', formatUnits(vnstTreasuryBal, vnstDecimals));
        console.log('  USDT Treasury:', formatUnits(usdtTreasuryBal, usdtDecimals));
        
        const usdtAllowance = await usdtToken.methods.allowance(currentAccount, CONFIG[NETWORK].swapContractAddress).call();
        const vntAllowance = await vntToken.methods.allowance(currentAccount, CONFIG[NETWORK].swapContractAddress).call();
        
        console.log('🔓 ALLOWANCES:');
        console.log('  USDT Allowance:', formatUnits(usdtAllowance, usdtDecimals));
        console.log('  VNT Allowance:', formatUnits(vntAllowance, vntDecimals));
        
        const testAmount = '1';
        const testBN = toTokenUnits(testAmount, usdtDecimals);
        console.log('\n🧪 TEST: Buy VNST with 1 USDT');
        
        let canBuy = true;
        const checks = [];
        
        if (web3.utils.toBN(testBN).lt(web3.utils.toBN(minVNSTBuyAmount))) {
            checks.push('❌ Amount less than min swap');
            canBuy = false;
        } else {
            checks.push('✅ Min swap check passed');
        }
        
        if (web3.utils.toBN(usdtBal).lt(web3.utils.toBN(testBN))) {
            checks.push('❌ Insufficient USDT balance');
            canBuy = false;
        } else {
            checks.push('✅ USDT balance sufficient');
        }
        
        if (web3.utils.toBN(usdtAllowance).lt(web3.utils.toBN(testBN))) {
            checks.push('❌ Insufficient USDT allowance - NEEDS APPROVAL');
            canBuy = false;
        } else {
            checks.push('✅ USDT allowance sufficient');
        }
        
        if (web3.utils.toBN(bnbBal).lt(web3.utils.toBN(swapFeeBNB))) {
            checks.push(`❌ Insufficient BNB (need ${formatUnits(swapFeeBNB, 18)})`);
            canBuy = false;
        } else {
            checks.push('✅ BNB balance sufficient');
        }
        
        const vnstQuote = await swapContract.methods.getVNSTQuote(testBN.toString()).call();
        if (web3.utils.toBN(vnstTreasuryBal).lt(web3.utils.toBN(vnstQuote))) {
            checks.push('❌ Insufficient VNST in treasury');
            canBuy = false;
        } else {
            checks.push('✅ VNST treasury sufficient');
        }
        
        if (paused) {
            checks.push('❌ Contract is paused');
            canBuy = false;
        } else {
            checks.push('✅ Contract not paused');
        }
        
        console.log('\n📝 CHECK RESULTS:');
        checks.forEach(check => console.log('  ' + check));
        
        if (canBuy) {
            console.log('\n✅ ALL CHECKS PASSED!');
        } else {
            console.log('\n❌ SOME CHECKS FAILED!');
        }
        
        console.log('===== 🔍 DETAILED DEBUG END =====');
        return { canBuy, checks, usdtAllowance, vntAllowance };
    } catch (error) {
        console.error('Debug error:', error);
    }
}

async function approveUSDT() {
    try {
        console.log('🔄 Approving USDT...');
        const amount = web3.utils.toBN(100).mul(web3.utils.toBN(10).pow(web3.utils.toBN(6)));
        const gasPrice = await getGasPrice();

        await usdtToken.methods.approve(
            CONFIG[NETWORK].swapContractAddress,
            amount.toString()
        ).send({
            from: currentAccount,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        console.log('✅ USDT Approved!');
        showMessage('✅ USDT approved successfully!', 'success');
        const allowance = await usdtToken.methods.allowance(currentAccount, CONFIG[NETWORK].swapContractAddress).call();
        console.log('New USDT Allowance:', formatUnits(allowance, usdtDecimals));
    } catch (error) {
        console.error('Approve USDT error:', error);
        showMessage('Failed to approve USDT: ' + error.message, 'error');
    }
}

async function approveVNT() {
    try {
        console.log('🔄 Approving VNT...');
        const amount = web3.utils.toBN(1000).mul(web3.utils.toBN(10).pow(web3.utils.toBN(18)));
        const gasPrice = await getGasPrice();
        
        await vntToken.methods.approve(
            CONFIG[NETWORK].swapContractAddress,
            amount.toString()
        ).send({
            from: currentAccount,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        console.log('✅ VNT Approved!');
        showMessage('✅ VNT approved successfully!', 'success');
        const allowance = await vntToken.methods.allowance(currentAccount, CONFIG[NETWORK].swapContractAddress).call();
        console.log('New VNT Allowance:', formatUnits(allowance, vntDecimals));
    } catch (error) {
        console.error('Approve VNT error:', error);
        showMessage('Failed to approve VNT: ' + error.message, 'error');
    }
}

async function checkAllowances() {
    try {
        console.log('===== 🔓 CHECKING ALLOWANCES =====');
        const usdtAllowance = await usdtToken.methods.allowance(currentAccount, CONFIG[NETWORK].swapContractAddress).call();
        const vntAllowance = await vntToken.methods.allowance(currentAccount, CONFIG[NETWORK].swapContractAddress).call();
        
        console.log('USDT Allowance:', formatUnits(usdtAllowance, usdtDecimals));
        console.log('VNT Allowance:', formatUnits(vntAllowance, vntDecimals));
        
        const usdtBal = await usdtToken.methods.balanceOf(currentAccount).call();
        const vntBal = await vntToken.methods.balanceOf(currentAccount).call();
        
        console.log('USDT Balance:', formatUnits(usdtBal, usdtDecimals));
        console.log('VNT Balance:', formatUnits(vntBal, vntDecimals));
        
        if (web3.utils.toBN(usdtAllowance).lt(web3.utils.toBN(usdtBal))) {
            console.log('⚠️ USDT Allowance is less than balance. Need to approve more.');
            console.log('Run: approveUSDT()');
        } else {
            console.log('✅ USDT Allowance is sufficient');
        }
        
        if (web3.utils.toBN(vntAllowance).lt(web3.utils.toBN(vntBal))) {
            console.log('⚠️ VNT Allowance is less than balance. Need to approve more.');
            console.log('Run: approveVNT()');
        } else {
            console.log('✅ VNT Allowance is sufficient');
        }
        
        console.log('===== END =====');
    } catch (error) {
        console.error('Error checking allowances:', error);
    }
}

async function testBuyVNST() {
    try {
        console.log('🧪 Testing Buy VNST with 1 USDT...');
        
        const usdtAmount = '1';
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        
        const allowance = await usdtToken.methods.allowance(currentAccount, CONFIG[NETWORK].swapContractAddress).call();
        if (web3.utils.toBN(allowance).lt(web3.utils.toBN(usdtBN))) {
            console.log('❌ Need to approve USDT first. Run: approveUSDT()');
            return;
        }
        
        const vnstQuote = await swapContract.methods.getVNSTQuote(usdtBN.toString()).call();
        const minOut = web3.utils.toBN(vnstQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));
        
        console.log('📝 Quote:', formatUnits(vnstQuote, vnstDecimals), 'VNST');
        console.log('📝 Min Out:', formatUnits(minOut, vnstDecimals), 'VNST');
        
        console.log('🔄 Sending transaction...');
        const gasPrice = await getGasPrice();

        const result = await swapContract.methods.buyVNST(usdtBN.toString(), minOut.toString()).send({
            from: currentAccount,
            value: swapFeeBNB,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        
        console.log('✅ Success! Transaction:', result.transactionHash);
        showMessage('✅ Test Buy VNST successful!', 'success');
        await updateWalletInfo();
    } catch (error) {
        console.error('Test Buy VNST failed:', error);
        showMessage('❌ Test failed: ' + error.message, 'error');
    }
}

async function completeFix() {
    try {
        console.log('🔄 Starting complete fix...');
        
        console.log('1️⃣ Approving USDT...');
        const usdtAmount = web3.utils.toBN(100).mul(web3.utils.toBN(10).pow(web3.utils.toBN(6)));
        const gasPrice = await getGasPrice();
        
        await usdtToken.methods.approve(
            CONFIG[NETWORK].swapContractAddress,
            usdtAmount.toString()
        ).send({
            from: currentAccount,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        console.log('✅ USDT approved');
        
        console.log('2️⃣ Approving VNT...');
        const vntAmount = web3.utils.toBN(1000).mul(web3.utils.toBN(10).pow(web3.utils.toBN(18)));
        const gasPrice = await getGasPrice();

        await vntToken.methods.approve(
            CONFIG[NETWORK].swapContractAddress,
            vntAmount.toString()
        ).send({
            from: currentAccount,
            gas: GAS_LIMIT,
            gasPrice: gasPrice
        });
        console.log('✅ VNT approved');
        
        console.log('✅ Complete fix done!');
        showMessage('✅ All approvals done! Now try swapping.', 'success');
        await detailedDebug();
    } catch (error) {
        console.error('Fix error:', error);
        showMessage('Error: ' + error.message, 'error');
    }
}

window.checkContractStatus = checkContractStatus;
window.detailedDebug = detailedDebug;
window.approveUSDT = approveUSDT;
window.approveVNT = approveVNT;
window.checkAllowances = checkAllowances;
window.testBuyVNST = testBuyVNST;
window.completeFix = completeFix;

console.log('✅ All debug functions loaded!');
console.log('📝 Available commands:');
console.log('  checkContractStatus() - Check all contract status');
console.log('  detailedDebug() - Detailed debug of all conditions');
console.log('  approveUSDT() - Approve USDT for spending');
console.log('  approveVNT() - Approve VNT for spending');
console.log('  checkAllowances() - Check token allowances');
console.log('  testBuyVNST() - Test Buy VNST with 1 USDT');
console.log('  completeFix() - Run complete fix (approve both tokens)');
