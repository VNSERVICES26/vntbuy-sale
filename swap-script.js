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
const STAKING_ABI = [{"inputs":[{"internalType":"address","name":"_vnstToken","type":"address"},{"internalType":"address","name":"_vntToken","type":"address"},{"internalType":"address","name":"_usdtToken","type":"address"},{"internalType":"address","name":"_vnstStakingWallet","type":"address"},{"internalType":"address","name":"_vntRewardWallet","type":"address"},{"internalType":"address","name":"_usdtRewardWallet","type":"address"},{"internalType":"address","name":"_vnstAutoStakeWallet","type":"address"},{"internalType":"address","name":"_feeWallet","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"paused","type":"bool"}],"name":"ContractPaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256[5]","name":"newPercents","type":"uint256[5]"}],"name":"DirectRewardPercentsChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"by","type":"address"},{"indexed":false,"internalType":"bool","name":"status","type":"bool"}],"name":"EmergencyStopped","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint256","name":"level","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"LevelDepositUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"level","type":"uint256"}],"name":"LevelUnlocked","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"MaxManualStakeLimitUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"minVNT","type":"uint256"}],"name":"MinWithdrawAmountsChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"status","type":"bool"}],"name":"MinWithdrawToggled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalUsers","type":"uint256"}],"name":"NewUserJoined","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"string","name":"message","type":"string"}],"name":"PercentageCheckFailed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":true,"internalType":"address","name":"newUser","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ReferralAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint256","name":"level","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"ReferralCommission","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"level","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ReferralReward","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"RewardClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"totalStaked","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"activeStake","type":"uint256"}],"name":"StakeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"address","name":"referrer","type":"address"}],"name":"Staked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalTeamStake","type":"uint256"}],"name":"TeamStakeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"USDTTransfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"string","name":"statusType","type":"string"},{"indexed":false,"internalType":"bool","name":"status","type":"bool"}],"name":"UserStatusChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"}],"name":"VNTTransfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalWithdrawn","type":"uint256"}],"name":"VNTWithdrawn","type":"event"},{"inputs":[],"name":"DAYS_IN_YEAR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FIXED_APY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SECONDS_PER_DAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"blacklisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"checkLevel","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimAllRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"claimVNTRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"countedAsValidReferral","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"curUserLevel","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"defaultReferral","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"directRewardPercents","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"emergencyStop","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"emergencyStopContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"emergencyWithdrawAllFunds","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"feeWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractStats","outputs":[{"internalType":"uint256","name":"usersCount","type":"uint256"},{"internalType":"uint256","name":"totalStaked","type":"uint256"},{"internalType":"uint256","name":"activeStake","type":"uint256"},{"internalType":"uint256","name":"vntWithdrawn","type":"uint256"},{"internalType":"uint256","name":"txCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getLevelDetails","outputs":[{"internalType":"uint256","name":"currentLevel","type":"uint256"},{"internalType":"uint256[]","name":"levelDeposits","type":"uint256[]"},{"internalType":"bool[]","name":"levelsAchieved","type":"bool[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMinWithdrawInfo","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"userAddress","type":"address"}],"name":"getPendingRewards","outputs":[{"internalType":"uint256","name":"vntRewards","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"level","type":"uint256"}],"name":"getReferralCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getReferralEarnings","outputs":[{"internalType":"uint256","name":"totalReferralRewards","type":"uint256"},{"internalType":"uint256","name":"totalTeamDeposits","type":"uint256"},{"internalType":"uint256","name":"referralCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_stakeIndex","type":"uint256"}],"name":"getStakeDays","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakeHistory","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"uint256[]","name":"startDays","type":"uint256[]"},{"internalType":"bool[]","name":"isActive","type":"bool[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_level","type":"uint256"}],"name":"getTeamUsers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_level","type":"uint256"},{"internalType":"uint256","name":"start","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"}],"name":"getTeamUsersPaginated","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getTotalReferralEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getTotalStaked","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getTotalTeamStake","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_level","type":"uint256"}],"name":"getTotalTeamStakeByLevel","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserLevel","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserStakeDetails","outputs":[{"internalType":"uint256","name":"manualStake","type":"uint256"},{"internalType":"uint256","name":"autoStake","type":"uint256"},{"internalType":"uint256","name":"totalStake","type":"uint256"},{"internalType":"uint256","name":"remainingManualLimit","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserStakesCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getValidReferrals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getWithdrawHistory","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"uint256[]","name":"timestamps","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_level","type":"uint256"}],"name":"isLevelUnlocked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxManualStakePerUser","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxStakeAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minStakeAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minVNTWithdraw","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"referralCountByLevel","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"resumeContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"bool","name":"status","type":"bool"}],"name":"setBlacklist","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[5]","name":"newPercents","type":"uint256[5]"}],"name":"setDirectRewardPercents","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newLimit","type":"uint256"}],"name":"setMaxManualStakeLimit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_minVNT","type":"uint256"}],"name":"setMinWithdrawLimits","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_paused","type":"bool"}],"name":"setPaused","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_min","type":"uint256"},{"internalType":"uint256","name":"_max","type":"uint256"}],"name":"setStakeLimits","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_vnstStakingWallet","type":"address"},{"internalType":"address","name":"_vntRewardWallet","type":"address"},{"internalType":"address","name":"_usdtRewardWallet","type":"address"},{"internalType":"address","name":"_vnstAutoStakeWallet","type":"address"},{"internalType":"address","name":"_feeWallet","type":"address"}],"name":"setWalletAddresses","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"bool","name":"status","type":"bool"}],"name":"setWhitelist","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"teamUsers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalActiveStake","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalStakedInContract","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalStakingTransactions","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalUsers","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalVNTWithdrawn","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usdtRewardWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usdtToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"userLevelDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userStakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"startDay","type":"uint256"},{"internalType":"uint256","name":"lastClaimDay","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"users","outputs":[{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"totalManualStaked","type":"uint256"},{"internalType":"uint256","name":"totalStaked","type":"uint256"},{"internalType":"uint256","name":"totalClaimed","type":"uint256"},{"internalType":"uint256","name":"lastClaimTimestamp","type":"uint256"},{"internalType":"uint256","name":"referralCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"validDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstAutoStakeWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstStakingWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vnstToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntRewardWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"whitelisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdrawFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"withdrawHistory","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"isCompleted","type":"bool"}],"stateMutability":"view","type":"function"}];

// Swap Contract ABI - Essential functions only
const SWAP_ABI = [{"inputs":[{"internalType":"address","name":"_vntToken","type":"address"},{"internalType":"address","name":"_usdtToken","type":"address"},{"internalType":"address","name":"_buyerWallet","type":"address"},{"internalType":"address","name":"_vntReceiver","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"BuyPriceUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"DailyBuyLimitUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"DailySellLimitUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newMinBuy","type":"uint256"}],"name":"MinBuyUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newMinSell","type":"uint256"}],"name":"MinSellUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"newReceiver","type":"address"}],"name":"ReceiverUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"SellPriceUpdated","type":"event"},{"anonymous":false,"inputs":[],"name":"SwapPaused","type":"event"},{"anonymous":false,"inputs":[],"name":"SwapResumed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"vntAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"rateUsed","type":"uint256"}],"name":"TokensPurchased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"rateUsed","type":"uint256"}],"name":"TokensSold","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"buyVNTWithUSDT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"buyerWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"calculateUsdtAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"calculateVNTAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"dailyBuyLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dailyPurchased","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"dailySellLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"dailySold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBuyPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"getBuyQuote","outputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBuyerAllowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getDailyPurchased","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getDailySold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getRemainingBuyLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getRemainingSellLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getSellPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getSellQuote","outputs":[{"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"seller","type":"address"}],"name":"getSellerAllowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalBought","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalSold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"seller","type":"address"}],"name":"isApproved","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isBuyerApproved","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isPaused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lastTradeTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minBuy","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minSell","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pauseSwap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"resumeSwap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint8","name":"fromDecimals","type":"uint8"},{"internalType":"uint8","name":"toDecimals","type":"uint8"}],"name":"scaleDecimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"sellVNT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalBought","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"totalPurchased","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"totalSold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSoldVNT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"updateBuyPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"updateDailyBuyLimit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"updateDailySellLimit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newMinBuy","type":"uint256"}],"name":"updateMinBuy","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newMinSell","type":"uint256"}],"name":"updateMinSell","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newReceiver","type":"address"}],"name":"updateReceiver","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"updateSellPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"usdtDecimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usdtToVntPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usdtToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntDecimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntReceiver","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntToUsdtPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"stateMutability":"payable","type":"receive"}];

// Token ABI - Essential functions only
const TOKEN_ABI = [{"inputs":[{"internalType":"address","name":"_usdtAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"by","type":"address"}],"name":"AddressBlacklisted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"by","type":"address"}],"name":"AddressWhitelisted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"FeeCollected","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"},{"indexed":true,"internalType":"address","name":"by","type":"address"}],"name":"TransferFeeChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"VNTPriceUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"vntAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdtAmount","type":"uint256"}],"name":"VNTPurchased","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"BLACKLIST_MANAGER_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FEE_MANAGER_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PAUSER_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_account","type":"address"}],"name":"blacklist","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"buyVNST","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"vntAmount","type":"uint256"}],"name":"getUSDTRequiredForVNST","outputs":[{"internalType":"uint256","name":"usdtRequired","type":"uint256"},{"internalType":"uint256","name":"usdtAllowance","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isBlacklisted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isPaused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"},{"internalType":"address","name":"","type":"address"}],"name":"roles","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"setTransferFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setVNTPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"transferFeePercent","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"usdtTokenAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"vntPriceInUSDT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_account","type":"address"}],"name":"whitelist","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"to","type":"address"}],"name":"withdrawUSDT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];

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
        console.log('calculateSellQuote input:', { vntAmountInputValue, currentAccount, isEligibleForSell, minSellAmount, vntDecimals, usdtDecimals });

        if (!vntAmountInputValue || isNaN(vntAmountInputValue) || vntAmountInputValue.trim() === '') {
            document.getElementById('sellQuoteResult').classList.add('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            return;
        }

        const vntAmount = toTokenUnits(vntAmountInputValue, vntDecimals);
        console.log('vntAmount (base units):', vntAmount.toString());

        const minSell = web3.utils.toBN(minSellAmount);
        if (vntAmount.lt(minSell)) {
            document.getElementById('sellQuoteResult').classList.add('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            showMessage(`Minimum sale is ${formatUnits(minSellAmount, vntDecimals)} VNT`, 'error');
            return;
        }

        if (!isEligibleForSell) {
            showMessage('You are not eligible to sell VNT. Only staking reward recipients and previous buyers can sell.', 'error');
            document.getElementById('sellQuoteResult').classList.add('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            return;
        }

        // CALL contract for quote
        const usdtAmountRaw = await swapContract.methods.getSellQuote(vntAmount.toString()).call();
        console.log('getSellQuote raw result:', usdtAmountRaw);

        // If contract returned "0", show info and disable selling
        if (web3.utils.toBN(usdtAmountRaw).isZero()) {
            const outEl = document.getElementById('usdtAmountReceived') || document.getElementById('usdtAmount');
            if (outEl) {
                if ('value' in outEl) outEl.value = '0';
                else outEl.textContent = '0';
            }
            document.getElementById('sellQuoteResult').classList.remove('hidden');
            document.getElementById('approveSellBtn').disabled = true;
            document.getElementById('sellBtn').disabled = true;
            showMessage('Quote returned 0 USDT — check contract price, decimals or eligibility.', 'error');
            return;
        }

        const usdtFormatted = formatUnits(usdtAmountRaw, usdtDecimals);
        console.log('usdtFormatted:', usdtFormatted);

        const usdtOutEl = document.getElementById('usdtAmountReceived') || document.getElementById('usdtAmount');
        if (usdtOutEl) {
            if ('value' in usdtOutEl) usdtOutEl.value = usdtFormatted;
            else usdtOutEl.textContent = usdtFormatted;
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
        showMessage('Error calculating sell quote. Check console for details.', 'error');
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
