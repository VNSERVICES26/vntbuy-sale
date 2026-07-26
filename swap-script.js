// swap-script.js - Updated for VirsenSwap with VNT, VNST, USDT

const CONFIG = {
    mainnet: {
        swapContractAddress: "0x63Ce5ED1175BFA8cC764124D7da5Fd6aA6353Bd6", // Replace with actual VirsenSwap address
        vntTokenAddress: "0xa7e41CB0A41dbFC801408d3B577fCed150c4eeEc", // Replace with actual VNT address
        vnstTokenAddress: "0x5C6cB004b50278c6726c3cBEDd25165c2072C46D", // Replace with actual VNST address
        usdtTokenAddress: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // BSC USDT
        chainId: "0x38",
        rpcUrl: "https://bsc-dataseed.binance.org/"
    }
};

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

// VirsenSwap ABI - Essential functions
const SWAP_ABI = [{"inputs":[{"internalType":"address","name":"_vnt","type":"address"},{"internalType":"address","name":"_vnst","type":"address"},{"internalType":"address","name":"_usdt","type":"address"},{"internalType":"address payable","name":"_feeWallet","type":"address"},{"internalType":"address","name":"_vntTreasury","type":"address"},{"internalType":"address","name":"_vnstTreasury","type":"address"},{"internalType":"address","name":"_usdtTreasury","type":"address"},{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"},{"internalType":"uint256","name":"_swapFeeBNB","type":"uint256"},{"internalType":"uint256","name":"_minSwapAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"AlreadyPaused","type":"error"},{"inputs":[],"name":"ContractPaused","type":"error"},{"inputs":[],"name":"FeeMismatch","type":"error"},{"inputs":[],"name":"InsufficientAllowance","type":"error"},{"inputs":[],"name":"InsufficientBalance","type":"error"},{"inputs":[],"name":"InvalidAddress","type":"error"},{"inputs":[],"name":"InvalidAmount","type":"error"},{"inputs":[],"name":"InvalidFee","type":"error"},{"inputs":[],"name":"InvalidToken","type":"error"},{"inputs":[],"name":"MinSwapNotMet","type":"error"},{"inputs":[],"name":"NotOwner","type":"error"},{"inputs":[],"name":"NotPaused","type":"error"},{"inputs":[],"name":"ReentrancyGuard","type":"error"},{"inputs":[],"name":"SlippageExceeded","type":"error"},{"inputs":[],"name":"TransferFailed","type":"error"},{"inputs":[],"name":"ZeroMinSwap","type":"error"},{"inputs":[],"name":"ZeroPrice","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldWallet","type":"address"},{"indexed":false,"internalType":"address","name":"newWallet","type":"address"}],"name":"FeeWalletUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldMin","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newMin","type":"uint256"}],"name":"MinSwapUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"pair","type":"string"},{"indexed":false,"internalType":"uint256","name":"oldPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"PriceUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"fromToken","type":"address"},{"indexed":false,"internalType":"address","name":"toToken","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minAmountOut","type":"uint256"}],"name":"SwapExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"SwapFeeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"treasury","type":"string"},{"indexed":false,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":false,"internalType":"address","name":"newAddress","type":"address"}],"name":"TreasuryUpdated","type":"event"},{"anonymous":false,"inputs":[],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vnstReceived","type":"uint256"}],"name":"VNSTPurchased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vntReceived","type":"uint256"}],"name":"VNTPurchased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntSold","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdtReceived","type":"uint256"}],"name":"VNTSold","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntSpent","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vnstReceived","type":"uint256"}],"name":"VNTSwapped","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"USDT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"VNST","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"VNT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"internalType":"uint256","name":"minVnstOut","type":"uint256"}],"name":"buyVNST","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"internalType":"uint256","name":"minVntOut","type":"uint256"}],"name":"buyVNT","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"emergencyWithdrawAllBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdrawBNB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"feeWallet","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBNBBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractInfo","outputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"bool","name":"_paused","type":"bool"},{"internalType":"uint256","name":"_minSwap","type":"uint256"},{"internalType":"uint256","name":"_fee","type":"uint256"},{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"},{"internalType":"uint256","name":"_totalSwapped","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSellVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSwapVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTreasuryBalances","outputs":[{"internalType":"uint256","name":"vntBal","type":"uint256"},{"internalType":"uint256","name":"vnstBal","type":"uint256"},{"internalType":"uint256","name":"usdtBal","type":"uint256"},{"internalType":"uint256","name":"bnbBal","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserAllowances","outputs":[{"internalType":"uint256","name":"vnt","type":"uint256"},{"internalType":"uint256","name":"vnst","type":"uint256"},{"internalType":"uint256","name":"usdt","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserTotalSwaps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNSTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getVNTQuote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minSwapAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"},{"internalType":"uint256","name":"minUsdtOut","type":"uint256"}],"name":"sellVNT","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_vntPrice","type":"uint256"},{"internalType":"uint256","name":"_vnstPrice","type":"uint256"},{"internalType":"uint256","name":"_vntToVnstPrice","type":"uint256"}],"name":"setAllPrices","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_vnt","type":"address"},{"internalType":"address","name":"_vnst","type":"address"},{"internalType":"address","name":"_usdt","type":"address"}],"name":"setAllTreasuries","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address payable","name":"newWallet","type":"address"}],"name":"setFeeWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newMin","type":"uint256"}],"name":"setMinSwap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"setSwapFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setUSDTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNSTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setVNSTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNTToVNSTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newTreasury","type":"address"}],"name":"setVNTTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"swapFeeBNB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"},{"internalType":"uint256","name":"minVnstOut","type":"uint256"}],"name":"swapVNTToVNST","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"totalSwapped","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"usdtTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userSwaps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntToVnstPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntTreasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"stateMutability":"payable","type":"receive"}];

// Token ABI - Minimal
const TOKEN_ABI = [
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}
];

window.addEventListener('load', async () => {
    await setupEventListeners();
    await checkWalletConnection();
    await initContracts();
    setupInputListeners();
    setupTabSystem();
    updateUI();
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
            document.getElementById(`${tabId}Section`).classList.add('active');
            
            if (currentAccount) {
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
    document.getElementById('copyContractBtn').addEventListener('click', copyContractAddress);
}

function setupInputListeners() {
    document.getElementById('usdtAmountBuy').addEventListener('input', updateBuyQuote);
    document.getElementById('vntAmountSell').addEventListener('input', updateSellQuote);
    document.getElementById('vntAmountSwap').addEventListener('input', updateSwapQuote);
}

function toTokenUnits(amount, decimals = 18) {
    try {
        if (!web3) return web3.utils.toBN(0);
        if (!amount || amount === '' || isNaN(Number(amount))) {
            return web3.utils.toBN(0);
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
        return web3.utils.toBN(0);
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
        } else {
            try {
                bnValue = BN(value.toString());
            } catch (e) {
                return String(value);
            }
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
        return String(value);
    }
}

async function checkWalletConnection() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
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
        window.ethereum.on('accountsChanged', (accounts) => {
            currentAccount = accounts.length > 0 ? accounts[0] : null;
            updateUI();
            if (currentAccount) {
                updateWalletInfo();
                updateBuyQuote();
                updateSellQuote();
                updateSwapQuote();
            }
        });
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        showMessage('Please install MetaMask or another Web3 wallet', 'error');
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        setupWalletEvents();
        await updateWalletInfo();
        showMessage('Wallet connected successfully', 'success');
        updateUI();
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected connection request', 'error');
        } else {
            showMessage(`Error connecting wallet: ${error.message}`, 'error');
        }
    }
}

async function updateWalletInfo() {
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

async function initContracts() {
    try {
        const config = CONFIG.mainnet;
        web3 = new Web3(window.ethereum || config.rpcUrl);
        
        swapContract = new web3.eth.Contract(SWAP_ABI, config.swapContractAddress);
        vntToken = new web3.eth.Contract(TOKEN_ABI, config.vntTokenAddress);
        vnstToken = new web3.eth.Contract(TOKEN_ABI, config.vnstTokenAddress);
        usdtToken = new web3.eth.Contract(TOKEN_ABI, config.usdtTokenAddress);
        
        // Get contract info
        const info = await swapContract.methods.getContractInfo().call();
        vntPrice = info._vntPrice;
        vnstPrice = info._vnstPrice;
        vntToVnstPrice = info._vntToVnstPrice;
        minSwapAmount = info._minSwap;
        swapFeeBNB = info._fee;
        
        // Get decimals
        vntDecimals = await vntToken.methods.decimals().call();
        vnstDecimals = await vnstToken.methods.decimals().call();
        usdtDecimals = await usdtToken.methods.decimals().call();
        
        // Update UI
        document.getElementById('vntPrice').textContent = formatUnits(vntPrice, 18) + ' USDT';
        document.getElementById('vnstPrice').textContent = formatUnits(vnstPrice, 18) + ' USDT';
        document.getElementById('minSwapAmount').textContent = formatUnits(minSwapAmount, 18) + ' USDT/VNT';
        document.getElementById('swapFee').textContent = formatUnits(swapFeeBNB, 18) + ' BNB';
        
        document.getElementById('sellVNTPrice').textContent = formatUnits(vntPrice, 18) + ' USDT/VNT';
        document.getElementById('sellMinSwap').textContent = formatUnits(minSwapAmount, 18) + ' VNT';
        document.getElementById('sellFee').textContent = formatUnits(swapFeeBNB, 18) + ' BNB';
        
        document.getElementById('swapRate').textContent = formatUnits(vntToVnstPrice, 18) + ' VNST/VNT';
        document.getElementById('swapMin').textContent = formatUnits(minSwapAmount, 18) + ' VNT';
        document.getElementById('swapFeeDisplay').textContent = formatUnits(swapFeeBNB, 18) + ' BNB';
        
        document.getElementById('contractAddress').textContent = config.swapContractAddress;
        
        if (currentAccount) {
            updateBuyQuote();
            updateSellQuote();
            updateSwapQuote();
        }
    } catch (error) {
        showMessage(`Error initializing contracts: ${error.message}`, 'error');
        console.error(error);
    }
}

async function updateBuyQuote() {
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
        if (usdtBN.lt(web3.utils.toBN(minSwapAmount))) {
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
        if (vntBN.lt(web3.utils.toBN(minSwapAmount))) {
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
        if (vntBN.lt(web3.utils.toBN(minSwapAmount))) {
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

async function buyVNT() {
    try {
        const usdtAmount = document.getElementById('usdtAmountBuy').value;
        if (!usdtAmount || isNaN(usdtAmount)) {
            showMessage('Please enter a valid USDT amount', 'error');
            return;
        }
        
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        if (usdtBN.lt(web3.utils.toBN(minSwapAmount))) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, usdtDecimals)} USDT`, 'error');
            return;
        }

        // Check USDT allowance
        const allowance = await usdtToken.methods.allowance(currentAccount, CONFIG.mainnet.swapContractAddress).call();
        if (web3.utils.toBN(allowance).lt(usdtBN)) {
            showMessage('Please approve USDT first', 'error');
            return;
        }

        // Get quote for slippage protection (5% slippage)
        const vntQuote = await swapContract.methods.getVNTQuote(usdtBN.toString()).call();
        const minOut = web3.utils.toBN(vntQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        await handleTransaction(
            swapContract.methods.buyVNT(usdtBN.toString(), minOut.toString()).send({
                from: currentAccount,
                value: swapFeeBNB
            }),
            'VNT purchased successfully!'
        );
        
        await updateWalletInfo();
        updateBuyQuote();
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Purchase failed: ${error.message}`, 'error');
        }
    }
}

async function buyVNST() {
    try {
        const usdtAmount = document.getElementById('usdtAmountBuy').value;
        if (!usdtAmount || isNaN(usdtAmount)) {
            showMessage('Please enter a valid USDT amount', 'error');
            return;
        }
        
        const usdtBN = toTokenUnits(usdtAmount, usdtDecimals);
        if (usdtBN.lt(web3.utils.toBN(minSwapAmount))) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, usdtDecimals)} USDT`, 'error');
            return;
        }

        const allowance = await usdtToken.methods.allowance(currentAccount, CONFIG.mainnet.swapContractAddress).call();
        if (web3.utils.toBN(allowance).lt(usdtBN)) {
            showMessage('Please approve USDT first', 'error');
            return;
        }

        const vnstQuote = await swapContract.methods.getVNSTQuote(usdtBN.toString()).call();
        const minOut = web3.utils.toBN(vnstQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        await handleTransaction(
            swapContract.methods.buyVNST(usdtBN.toString(), minOut.toString()).send({
                from: currentAccount,
                value: swapFeeBNB
            }),
            'VNST purchased successfully!'
        );
        
        await updateWalletInfo();
        updateBuyQuote();
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Purchase failed: ${error.message}`, 'error');
        }
    }
}

async function sellVNT() {
    try {
        const vntAmount = document.getElementById('vntAmountSell').value;
        if (!vntAmount || isNaN(vntAmount)) {
            showMessage('Please enter a valid VNT amount', 'error');
            return;
        }
        
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        if (vntBN.lt(web3.utils.toBN(minSwapAmount))) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, vntDecimals)} VNT`, 'error');
            return;
        }

        const allowance = await vntToken.methods.allowance(currentAccount, CONFIG.mainnet.swapContractAddress).call();
        if (web3.utils.toBN(allowance).lt(vntBN)) {
            showMessage('Please approve VNT first', 'error');
            return;
        }

        const usdtQuote = await swapContract.methods.getSellVNTQuote(vntBN.toString()).call();
        const minOut = web3.utils.toBN(usdtQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        await handleTransaction(
            swapContract.methods.sellVNT(vntBN.toString(), minOut.toString()).send({
                from: currentAccount,
                value: swapFeeBNB
            }),
            'VNT sold successfully!'
        );
        
        await updateWalletInfo();
        updateSellQuote();
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Sale failed: ${error.message}`, 'error');
        }
    }
}

async function swapVNTToVNST() {
    try {
        const vntAmount = document.getElementById('vntAmountSwap').value;
        if (!vntAmount || isNaN(vntAmount)) {
            showMessage('Please enter a valid VNT amount', 'error');
            return;
        }
        
        const vntBN = toTokenUnits(vntAmount, vntDecimals);
        if (vntBN.lt(web3.utils.toBN(minSwapAmount))) {
            showMessage(`Minimum swap is ${formatUnits(minSwapAmount, vntDecimals)} VNT`, 'error');
            return;
        }

        const allowance = await vntToken.methods.allowance(currentAccount, CONFIG.mainnet.swapContractAddress).call();
        if (web3.utils.toBN(allowance).lt(vntBN)) {
            showMessage('Please approve VNT first', 'error');
            return;
        }

        const vnstQuote = await swapContract.methods.getSwapVNTQuote(vntBN.toString()).call();
        const minOut = web3.utils.toBN(vnstQuote).mul(web3.utils.toBN(95)).div(web3.utils.toBN(100));

        await handleTransaction(
            swapContract.methods.swapVNTToVNST(vntBN.toString(), minOut.toString()).send({
                from: currentAccount,
                value: swapFeeBNB
            }),
            'VNT → VNST swapped successfully!'
        );
        
        await updateWalletInfo();
        updateSwapQuote();
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Swap failed: ${error.message}`, 'error');
        }
    }
}

async function handleTransaction(transactionPromise, successMessage) {
    try {
        showMessage('Processing transaction...', 'status');
        const result = await transactionPromise;
        showMessage(successMessage, 'success');
        return result;
    } catch (error) {
        throw error;
    }
}

function copyContractAddress() {
    const address = document.getElementById('contractAddress').textContent;
    navigator.clipboard.writeText(address);
    showMessage('Contract address copied!', 'success');
}

function updateUI() {
    const isConnected = currentAccount !== null;
    document.getElementById('connectWalletBtn').textContent = isConnected ? 'Connected' : 'Connect Wallet';
    document.getElementById('walletInfo').classList.toggle('hidden', !isConnected);
}

function shortenAddress(address) {
    return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
}

function showMessage(message, type = 'status') {
    const statusDiv = document.getElementById('statusMessages');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.classList.add(`${type}-message`);
    statusDiv.appendChild(messageElement);
    setTimeout(() => messageElement.remove(), 5000);
}
