const CONFIG = {
    mainnet: {
        vntSwapAddress: "0xCe5456f15f8331996Ce9c93356bFDff8b93EC38e", 
        vntTokenAddress: "0xD379Fd70C5C334bb31208122A6781ADB032D176f", 
        usdtTokenAddress: "0x55d398326f99059fF775485246999027B3197955",
        stakingContractAddress: "0xe73552Ac9DA8dd2d464526FD07A5b519fA9ccBDf",
        chainId: "0x38",
        rpcUrl: "https://bsc-dataseed.binance.org/"
    }
};

let web3;
let swapContract;
let vntToken;
let usdtToken;
let stakingContract;
let currentAccount = null;
let minSellAmount = 0;
let minBuyAmount = 0;
let vntDecimals = 18;
let usdtDecimals = 18;
let isEligibleForSell = false;

// Staking Contract ABI - Essential functions only
const STAKING_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "userAddress", "type": "address"}],
        "name": "getPendingRewards",
        "outputs": [{"internalType": "uint256", "name": "vntRewards", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
        "name": "getTotalStaked",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserStakesCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Swap Contract ABI - Essential functions only
const SWAP_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "usdtAmount", "type": "uint256"}],
        "name": "buyVNTWithUSDT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "usdtAmount", "type": "uint256"}],
        "name": "getBuyQuote",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "vntAmount", "type": "uint256"}],
        "name": "getSellQuote",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "minBuy",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "minSell",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "usdtToVntPrice",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "vntToUsdtPrice",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "totalPurchased",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "vntToken",
        "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "vntAmount", "type": "uint256"}],
        "name": "sellVNT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getRemainingBuyLimit",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getRemainingSellLimit",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Token ABI - Essential functions only
const TOKEN_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    }
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
                if (tabId === 'buy') {
                    calculateBuyQuote();
                } else {
                    calculateSellQuote();
                }
            }
        });
    });
}

async function setupEventListeners() {
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    document.getElementById('approveBuyBtn').addEventListener('click', approveUSDT);
    document.getElementById('buyBtn').addEventListener('click', buyVNT);
    document.getElementById('approveSellBtn').addEventListener('click', approveVNT);
    document.getElementById('sellBtn').addEventListener('click', sellVNT);
    document.getElementById('copyContractBtn').addEventListener('click', copyContractAddress);
}

function setupInputListeners() {
    const usdtAmountInput = document.getElementById('usdtAmount');
    const vntAmountInput = document.getElementById('vntAmountInput');

    console.log('Input Elements Found:', {
        usdtInput: usdtAmountInput,
        vntInput: vntAmountInput
    });
    
    usdtAmountInput.addEventListener('input', async () => {
        if (currentAccount) {
            await calculateBuyQuote();
        }
    });
    
    vntAmountInput.addEventListener('input', async () => {
        if (currentAccount) {
            await calculateSellQuote();
        }
    });
}

function toTokenUnits(amount, decimals = 18) {
    try {
        if (!amount || amount === '' || isNaN(amount)) {
            return web3.utils.toBN(0);
        }
        
        const amountStr = amount.toString().trim();
        
        if (amountStr === '') {
            return web3.utils.toBN(0);
        }
        
        return web3.utils.toBN(amountStr).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
    } catch (error) {
        console.error('Error in toTokenUnits:', error);
        return web3.utils.toBN(0);
    }
}

async function calculateBuyQuote() {
    try {
        const usdtAmountInput = document.getElementById('usdtAmount').value;
        
        if (!usdtAmountInput || isNaN(usdtAmountInput) || usdtAmountInput.trim() === '') {
            document.getElementById('buyQuoteResult').classList.add('hidden');
            document.getElementById('approveBuyBtn').disabled = true;
            document.getElementById('buyBtn').disabled = true;
            return;
        }
        
        const usdtAmount = toTokenUnits(usdtAmountInput, usdtDecimals);
        const minBuy = web3.utils.toBN(minBuyAmount);
        
        if (usdtAmount.lt(minBuy)) {
            document.getElementById('buyQuoteResult').classList.add('hidden');
            document.getElementById('approveBuyBtn').disabled = true;
            document.getElementById('buyBtn').disabled = true;
            return;
        }
        
        const vntAmount = await swapContract.methods.getBuyQuote(usdtAmount.toString()).call();
        
        document.getElementById('vntAmount').textContent = formatUnits(vntAmount, vntDecimals);
        document.getElementById('buyQuoteResult').classList.remove('hidden');
        
        const isApproved = await checkBuyApprovalStatus(usdtAmount.toString());
        document.getElementById('approveBuyBtn').disabled = isApproved;
        document.getElementById('buyBtn').disabled = !isApproved;
        
    } catch (error) {
        console.error('Buy quote calculation error:', error);
        document.getElementById('buyQuoteResult').classList.add('hidden');
        document.getElementById('approveBuyBtn').disabled = true;
        document.getElementById('buyBtn').disabled = true;
    }
}

async function calculateSellQuote() {
    try {
        const vntAmountInput = document.getElementById('vntAmountInput').value;
        
        if (!vntAmountInput || isNaN(vntAmountInput) || vntAmountInput.trim() === '') {
            document.getElementById('sellQuoteResult').classList.add('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            return;
        }
        
        const vntAmount = toTokenUnits(vntAmountInput, vntDecimals);
        const minSell = web3.utils.toBN(minSellAmount);
        
        if (vntAmount.lt(minSell)) {
            document.getElementById('sellQuoteResult').classList.add('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            return;
        }
        
        if (!isEligibleForSell) {
            showMessage('You are not eligible to sell VNT. Only staking reward recipients and previous buyers can sell.', 'error');
            document.getElementById('sellQuoteResult').classList.add('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            return;
        }
        
        const usdtAmount = await swapContract.methods.getSellQuote(vntAmount.toString()).call();
        
        document.getElementById('usdtAmount').textContent = formatUnits(usdtAmount, usdtDecimals);
        document.getElementById('sellQuoteResult').classList.remove('hidden');
        
        const isApproved = await checkSellApprovalStatus(vntAmount.toString());
        document.getElementById('approveSellBtn').disabled = isApproved;
        document.getElementById('sellBtn').disabled = !isApproved;
        
    } catch (error) {
        console.error('Sell quote calculation error:', error);
        document.getElementById('sellQuoteResult').classList.add('hidden');
        document.getElementById('approveSellBtn').disabled = true;
        document.getElementById('sellBtn').disabled = true;
    }
}

async function checkWalletConnection() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                setupWalletEvents();
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
                calculateBuyQuote();
                calculateSellQuote();
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
        await checkSellEligibility();
        
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
        const vntBalance = await vntToken.methods.balanceOf(currentAccount).call();
        const usdtBalance = await usdtToken.methods.balanceOf(currentAccount).call();
        
        document.getElementById('walletAddress').textContent = shortenAddress(currentAccount);
        document.getElementById('vntBalance').textContent = formatUnits(vntBalance, vntDecimals);
        document.getElementById('usdtBalance').textContent = formatUnits(usdtBalance, usdtDecimals);
        document.getElementById('walletInfo').classList.remove('hidden');
    } catch (error) {
        console.error('Error updating wallet info:', error);
    }
}

async function checkSellEligibility() {
    try {
        let hasStakingActivity = false;
        let hasRewards = false;
        
        try {
            const totalStaked = await stakingContract.methods.getTotalStaked(currentAccount).call();
            const userStakesCount = await stakingContract.methods.getUserStakesCount(currentAccount).call();
            const pendingRewards = await stakingContract.methods.getPendingRewards(currentAccount).call();
            
            hasStakingActivity = web3.utils.toBN(totalStaked).gt(web3.utils.toBN(0)) || 
                               web3.utils.toBN(userStakesCount).gt(web3.utils.toBN(0));
            hasRewards = web3.utils.toBN(pendingRewards).gt(web3.utils.toBN(0));
            
        } catch (stakingError) {
            console.log('Staking contract check failed:', stakingError);
        }
        
        const totalPurchased = await swapContract.methods.totalPurchased(currentAccount).call();
        const hasPurchased = web3.utils.toBN(totalPurchased).gt(web3.utils.toBN(0));
        
        isEligibleForSell = hasStakingActivity || hasRewards || hasPurchased;
        
        const walletStatus = document.getElementById('walletStatus');
        if (isEligibleForSell) {
            let eligibilityReason = '';
            if (hasStakingActivity) eligibilityReason = ' (Staking Activity)';
            else if (hasRewards) eligibilityReason = ' (Pending Rewards)';
            else if (hasPurchased) eligibilityReason = ' (Previous Purchase)';
            
            walletStatus.innerHTML = `<div class="success-message">✅ Eligible to sell VNT${eligibilityReason}</div>`;
        } else {
            walletStatus.innerHTML = `<div class="error-message">❌ Not eligible to sell VNT. Only stakers and previous buyers can sell.</div>`;
        }
        
    } catch (error) {
        console.error('Error checking sell eligibility:', error);
        isEligibleForSell = false;
        const walletStatus = document.getElementById('walletStatus');
        walletStatus.innerHTML = `<div class="error-message">⚠️ Could not verify eligibility. Please try again.</div>`;
    }
}

async function initContracts() {
    try {
        const config = CONFIG.mainnet;
        web3 = new Web3(window.ethereum || config.rpcUrl);
        
        swapContract = new web3.eth.Contract(SWAP_ABI, config.vntSwapAddress);
        vntToken = new web3.eth.Contract(TOKEN_ABI, config.vntTokenAddress);
        usdtToken = new web3.eth.Contract(TOKEN_ABI, config.usdtTokenAddress);
        stakingContract = new web3.eth.Contract(STAKING_ABI, config.stakingContractAddress);
        
        minSellAmount = await swapContract.methods.minSell().call();
        minBuyAmount = await swapContract.methods.minBuy().call();
        vntDecimals = await vntToken.methods.decimals().call();
        usdtDecimals = await usdtToken.methods.decimals().call();
        
        document.getElementById('minSellAmount').textContent = formatUnits(minSellAmount, vntDecimals) + ' VNT';
        document.getElementById('minBuyAmount').textContent = formatUnits(minBuyAmount, usdtDecimals) + ' USDT';
        
        await loadContractData();
    } catch (error) {
        showMessage(`Error initializing contracts: ${error.message}`, 'error');
    }
}

async function loadContractData() {
    try {
        const buyPrice = await swapContract.methods.usdtToVntPrice().call();
        const sellPrice = await swapContract.methods.vntToUsdtPrice().call();
        
        document.getElementById('buyPrice').textContent = `${formatUnits(buyPrice, 18)} USDT`;
        document.getElementById('sellPrice').textContent = `${formatUnits(sellPrice, 18)} USDT`;
        
        document.getElementById('vntContract').textContent = await swapContract.methods.vntToken().call();
        
        if (currentAccount) {
            const buyLimit = await swapContract.methods.getRemainingBuyLimit(currentAccount).call();
            const sellLimit = await swapContract.methods.getRemainingSellLimit(currentAccount).call();
            
            document.getElementById('buyLimit').textContent = formatUnits(buyLimit, vntDecimals) + ' VNT';
            document.getElementById('sellLimit').textContent = formatUnits(sellLimit, vntDecimals) + ' VNT';
        }
        
    } catch (error) {
        console.error('Error loading contract data:', error);
    }
}

async function checkBuyApprovalStatus(usdtAmount) {
    try {
        if (!usdtAmount || web3.utils.toBN(usdtAmount).isZero()) {
            return false;
        }
        
        if (web3.utils.toBN(usdtAmount).lt(web3.utils.toBN(minBuyAmount))) {
            return false;
        }
        
        const currentAllowance = await usdtToken.methods.allowance(
            currentAccount, 
            CONFIG.mainnet.vntSwapAddress
        ).call();
        
        return web3.utils.toBN(currentAllowance).gte(web3.utils.toBN(usdtAmount));
    } catch (error) {
        console.error('Buy approval check error:', error);
        return false;
    }
}

async function checkSellApprovalStatus(vntAmount) {
    try {
        if (!vntAmount || web3.utils.toBN(vntAmount).isZero()) {
            return false;
        }
        
        if (web3.utils.toBN(vntAmount).lt(web3.utils.toBN(minSellAmount))) {
            return false;
        }
        
        const currentAllowance = await vntToken.methods.allowance(
            currentAccount, 
            CONFIG.mainnet.vntSwapAddress
        ).call();
        
        return web3.utils.toBN(currentAllowance).gte(web3.utils.toBN(vntAmount));
    } catch (error) {
        console.error('Sell approval check error:', error);
        return false;
    }
}

async function approveUSDT() {
    try {
        const usdtAmountInput = document.getElementById('usdtAmount').value;
        if (!usdtAmountInput || isNaN(usdtAmountInput)) {
            showMessage('Please enter a valid USDT amount', 'error');
            return;
        }
        
        const usdtAmount = toTokenUnits(usdtAmountInput, usdtDecimals);
        
        if (usdtAmount.lt(web3.utils.toBN(minBuyAmount))) {
            showMessage(`Minimum buy is ${formatUnits(minBuyAmount, usdtDecimals)} USDT`, 'error');
            return;
        }
        
        await handleTransaction(
            usdtToken.methods.approve(
                CONFIG.mainnet.vntSwapAddress,
                usdtAmount.toString()
            ).send({ from: currentAccount }),
            'USDT approved successfully!'
        );
        
        document.getElementById('approveBuyBtn').disabled = true;
        document.getElementById('buyBtn').disabled = false;
        
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Approval failed: ${error.message}`, 'error');
        }
    }
}

async function approveVNT() {
    try {
        const vntAmountInput = document.getElementById('vntAmountInput').value;
        
        if (!vntAmountInput || isNaN(vntAmountInput)) {
            showMessage('Please enter a valid VNT amount', 'error');
            return;
        }
        
        const vntAmount = toTokenUnits(vntAmountInput, vntDecimals);
        
        if (vntAmount.lt(web3.utils.toBN(minSellAmount))) {
            showMessage(`Minimum sale is ${formatUnits(minSellAmount, vntDecimals)} VNT`, 'error');
            return;
        }
        
        await handleTransaction(
            vntToken.methods.approve(
                CONFIG.mainnet.vntSwapAddress,
                vntAmount.toString()
            ).send({ from: currentAccount }),
            'VNT approved successfully!'
        );
        
        document.getElementById('approveSellBtn').disabled = true;
        document.getElementById('sellBtn').disabled = false;
        
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Approval failed: ${error.message}`, 'error');
        }
    }
}

async function buyVNT() {
    try {
        const usdtAmountInput = document.getElementById('usdtAmount').value;
        if (!usdtAmountInput || isNaN(usdtAmountInput)) {
            showMessage('Please enter a valid USDT amount', 'error');
            return;
        }
        
        const usdtAmount = toTokenUnits(usdtAmountInput, usdtDecimals);
        
        if (usdtAmount.lt(web3.utils.toBN(minBuyAmount))) {
            showMessage(`Minimum buy is ${formatUnits(minBuyAmount, usdtDecimals)} USDT`, 'error');
            return;
        }
        
        await handleTransaction(
            swapContract.methods.buyVNTWithUSDT(usdtAmount.toString()).send({ from: currentAccount }),
            'VNT purchased successfully!'
        );
        
        await updateWalletInfo();
        await checkSellEligibility();
        await loadContractData();
        updateUI();
        
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
        const vntAmountInput = document.getElementById('vntAmountInput').value;
        if (!vntAmountInput || isNaN(vntAmountInput)) {
            showMessage('Please enter a valid VNT amount', 'error');
            return;
        }
        
        const vntAmount = toTokenUnits(vntAmountInput, vntDecimals);
        
        if (vntAmount.lt(web3.utils.toBN(minSellAmount))) {
            showMessage(`Minimum sale is ${formatUnits(minSellAmount, vntDecimals)} VNT`, 'error');
            return;
        }
        
        if (!isEligibleForSell) {
            showMessage('You are not eligible to sell VNT. Only staking reward recipients and previous buyers can sell.', 'error');
            return;
        }
        
        await handleTransaction(
            swapContract.methods.sellVNT(vntAmount.toString()).send({ from: currentAccount }),
            'VNT sold successfully!'
        );
        
        await updateWalletInfo();
        await loadContractData();
        updateUI();
        
    } catch (error) {
        if (error.code === 4001) {
            showMessage('User rejected transaction', 'error');
        } else {
            showMessage(`Sale failed: ${error.message}`, 'error');
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
    const address = document.getElementById('vntContract').textContent;
    navigator.clipboard.writeText(address);
    showMessage('Contract address copied!', 'success');
}

function updateUI() {
    const isConnected = currentAccount !== null;
    document.getElementById('connectWalletBtn').textContent = isConnected ? 'Connected' : 'Connect Wallet';
    document.getElementById('walletInfo').classList.toggle('hidden', !isConnected);
    
    document.getElementById('approveBuyBtn').disabled = !isConnected;
    document.getElementById('buyBtn').disabled = true;
    document.getElementById('approveSellBtn').disabled = !isConnected || !isEligibleForSell;
    document.getElementById('sellBtn').disabled = true;
}

function formatUnits(value, decimals) {
    const number = typeof value === 'string' ? parseFloat(value) : value;
    return (number / 10 ** decimals).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals
    });
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
