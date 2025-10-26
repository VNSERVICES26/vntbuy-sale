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

/*
  toTokenUnits:
  - Properly converts a decimal string like "1.5" into token base units BN based on decimals.
  - Returns a web3.utils.BN.
*/
function toTokenUnits(amount, decimals = 18) {
    try {
        if (!web3) return web3 && web3.utils ? web3.utils.toBN(0) : null;
        if (!amount || amount === '' || isNaN(Number(amount))) {
            return web3.utils.toBN(0);
        }

        const amountStr = amount.toString().trim();
        if (amountStr === '') return web3.utils.toBN(0);

        // handle decimal inputs like "1.234"
        if (amountStr.indexOf('.') === -1) {
            return web3.utils.toBN(amountStr).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
        }

        const parts = amountStr.split('.');
        const whole = parts[0] || '0';
        let fraction = parts[1] || '';
        if (fraction.length > decimals) {
            // truncate extra precision (could also round, but truncation is safer for on-chain)
            fraction = fraction.substring(0, decimals);
        }
        // pad fraction to decimals
        while (fraction.length < decimals) fraction += '0';

        const wholeBN = web3.utils.toBN(whole).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
        const fractionBN = web3.utils.toBN(fraction);
        return wholeBN.add(fractionBN);
    } catch (error) {
        console.error('Error in toTokenUnits:', error);
        return web3.utils.toBN(0);
    }
}

/*
  formatUnits:
  - Accepts BN or numeric string (base units) and decimals.
  - Uses BN math to avoid precision loss with very large numbers.
  - Returns a human readable string with up to 6 fractional digits (trims trailing zeros).
*/
function formatUnits(value, decimals = 18, maxFractionDigits = 6) {
    try {
        if (!web3) return '0';
        const BN = web3.utils.toBN;
        let bnValue;
        if (typeof value === 'string' && value.match(/^\d+$/)) {
            bnValue = BN(value);
        } else if (typeof value === 'number') {
            // convert number to string without exponential form
            bnValue = BN(String(Math.floor(value)));
        } else {
            // might be numeric string with big number, or BN-like
            try {
                bnValue = BN(value.toString());
            } catch (e) {
                // fallback
                return String(value);
            }
        }

        const base = BN(10).pow(BN(decimals));
        const whole = bnValue.div(base).toString();
        let fractionBN = bnValue.mod(base).toString().padStart(decimals, '0');

        if (Number(fractionBN) === 0) {
            // no fractional part
            return Number(whole).toLocaleString();
        }

        // keep only up to maxFractionDigits significant digits and trim trailing zeros
        fractionBN = fractionBN.substring(0, maxFractionDigits);
        fractionBN = fractionBN.replace(/0+$/, '');
        if (fractionBN === '') return Number(whole).toLocaleString();
        return `${Number(whole).toLocaleString()}.${fractionBN}`;
    } catch (error) {
        console.error('formatUnits error:', error);
        return String(value);
    }
}

async function calculateBuyQuote() {
    try {
        const usdtAmountInputValue = document.getElementById('usdtAmount').value;
        
        if (!usdtAmountInputValue || isNaN(usdtAmountInputValue) || usdtAmountInputValue.trim() === '') {
            document.getElementById('buyQuoteResult').classList.add('hidden');
            document.getElementById('approveBuyBtn').disabled = true;
            document.getElementById('buyBtn').disabled = true;
            return;
        }
        
        const usdtAmount = toTokenUnits(usdtAmountInputValue, usdtDecimals);
        const minBuy = web3.utils.toBN(minBuyAmount);
        
        if (usdtAmount.lt(minBuy)) {
            document.getElementById('buyQuoteResult').classList.add('hidden');
            document.getElementById('approveBuyBtn').disabled = true;
            document.getElementById('buyBtn').disabled = true;
            return;
        }
        
        const vntAmount = await swapContract.methods.getBuyQuote(usdtAmount.toString()).call();
        
        const vntEl = document.getElementById('vntAmount');
        const vntFormatted = formatUnits(vntAmount, vntDecimals);
        // update both value (if input) and textContent (if span/div)
        if (vntEl) {
            if ('value' in vntEl) vntEl.value = vntFormatted;
            else vntEl.textContent = vntFormatted;
        }

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
        const vntAmountInputValue = document.getElementById('vntAmountInput').value;
        
        if (!vntAmountInputValue || isNaN(vntAmountInputValue) || vntAmountInputValue.trim() === '') {
            document.getElementById('sellQuoteResult').classList.add('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            return;
        }
        
        const vntAmount = toTokenUnits(vntAmountInputValue, vntDecimals);
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
        const usdtFormatted = formatUnits(usdtAmount, usdtDecimals);

        // update an element for USDT received. The UI may use an input or a span.
        // Try to update both value and textContent to be resilient to HTML structure.
        const usdtEl = document.getElementById('usdtAmount');
        if (usdtEl) {
            try {
                if ('value' in usdtEl) usdtEl.value = usdtFormatted;
                else usdtEl.textContent = usdtFormatted;
            } catch (e) {
                // fallback
                usdtEl.textContent = usdtFormatted;
            }
        } else {
            // fallback: if there is a dedicated output element for sell results, try it
            const usdtOut = document.getElementById('usdtAmountReceived') || document.getElementById('sellUsdtAmount');
            if (usdtOut) {
                if ('value' in usdtOut) usdtOut.value = usdtFormatted;
                else usdtOut.textContent = usdtFormatted;
            }
        }
        
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
