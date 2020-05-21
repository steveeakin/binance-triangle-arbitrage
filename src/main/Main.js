const CONFIG = require('../../config/config');
const logger = require('./Loggers');
const os = require('os');
const MarketCache = require('./MarketCache');
const HUD = require('./HUD');
const BinanceApi = require('./BinanceApi');
const ArbitrageExecution = require('./ArbitrageExecution');
const CalculationNode = require('./CalculationNode');
const SpeedTest = require('./SpeedTest');

var tradeFees = [];
// Helps identify application startup
logger.execution.info(logger.LINE);
logger.performance.info(logger.LINE);

if ((CONFIG.TRADING.ENABLED === true) && ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO)) {
    console.log(`WARNING! Order execution is enabled!\n`);
}

SpeedTest.multiPing()
    .then((pings) => {
        const msg = `Successfully pinged Binance in ${(pings.reduce((a,b) => a+b, 0) / pings.length).toFixed(0)} ms`;
        console.log(msg);
        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.performance.info(msg);
        }
    })
    .then(BinanceApi.getFees)
    .then((result) => tradeFees = result)
    .then(ArbitrageExecution.refreshBalances)
    .then(BinanceApi.exchangeInfo)
    .then(exchangeInfo => MarketCache.initialize(exchangeInfo, CONFIG.TRADING.WHITELIST, CONFIG.INVESTMENT.BASE, tradeFees))
    .then(checkConfig)
    .then(checkBalances)
    .then(() => {
        // Listen for depth updates
        const tickers = MarketCache.getTickerArray();
        console.log(`Opening ${tickers.length} depth websockets ...`);
        return BinanceApi.depthCacheStaggered(tickers, CONFIG.DEPTH.SIZE, CONFIG.DEPTH.INITIALIZATION_INTERVAL);
    })
    .then(() => {
        console.log();
        console.log(`Execution Strategy:     ${CONFIG.TRADING.EXECUTION_STRATEGY}`);
        console.log(`Execution Limit:        ${CONFIG.TRADING.EXECUTION_CAP} execution(s)`);
        console.log(`Profit Threshold:       ${CONFIG.TRADING.PROFIT_THRESHOLD.toFixed(2)}%`);
        console.log(`Age Threshold:          ${CONFIG.TRADING.AGE_THRESHOLD} ms`);
        console.log(`Log Level:              ${CONFIG.LOG.LEVEL}`);
        console.log();

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.performance.debug(`Operating System: ${os.type()}`);
            logger.performance.debug(`Cores Speeds: [${os.cpus().map(cpu => cpu.speed)}] MHz`);
        }

        // Allow time to read output before starting calculation cycles
        setTimeout(calculateArbitrage, 5000);
    })
    .catch(console.error);

function calculateArbitrage() {
    if (CONFIG.DEPTH.PRUNE) MarketCache.pruneDepthsAboveThreshold(CONFIG.DEPTH.SIZE);

    const { calculationTime, successCount, errorCount, results } = CalculationNode.cycle(
        MarketCache.relationships,
        BinanceApi.getDepthSnapshots(MarketCache.getTickerArray()),
        (e) => logger.performance.warn(e),
        ArbitrageExecution.executeCalculatedPosition
    );


    if (CONFIG.HUD.ENABLED) refreshHUD(results);
    displayCalculationResults(successCount, errorCount, calculationTime);
    setTimeout(calculateArbitrage, CONFIG.CALCULATION_COOLDOWN);
}

function displayCalculationResults(successCount, errorCount, calculationTime) {
    const totalCalculations = successCount + errorCount;

    if (errorCount > 0) {
        logger.performance.warn(`Completed ${successCount}/${totalCalculations} (${((successCount/totalCalculations) * 100).toFixed(1)}%) calculations in ${calculationTime} ms`);
    }

    if (CalculationNode.cycleCount % 500 === 0) {
        const tickersWithoutDepthUpdate = MarketCache.getTickersWithoutDepthCacheUpdate();
        if (tickersWithoutDepthUpdate.length > 0) {
            logger.performance.debug(`Tickers without a depth cache update: [${tickersWithoutDepthUpdate}]`);
        }
        logger.performance.debug(`Recent calculations completed in ${calculationTime} ms`);
    }
}

function checkConfig() {
    console.log(`Checking configuration ...`);

    const VALID_VALUES = {
        TRADING: {
            EXECUTION_STRATEGY: ['linear', 'parallel']
        },
        DEPTH: {
            SIZE: [5, 10, 20, 50, 100, 500]
        }
    };

    if (MarketCache.getTickerArray().length < 3) {
        const msg = `Watching ${MarketCache.getTickerArray().length} ticker(s) is not sufficient to engage in triangle arbitrage`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.debug(`Watched Tickers: [${MarketCache.getTickerArray()}]`);
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (MarketCache.symbols.size < 3) {
        const msg = `Watching ${MarketCache.symbols.size} symbol(s) is not sufficient to engage in triangle arbitrage`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.debug(`Watched Symbols: [${Array.from(MarketCache.symbols)}]`);
            logger.execution.error(msg);
        }
        throw new Error(msg);
    }
    if (MarketCache.relationships.length === 0) {
        const msg = `Watching ${MarketCache.relationships.length} triangular relationships is not sufficient to engage in triangle arbitrage`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (CONFIG.INVESTMENT.STEP <= 0) {
        const msg = `INVESTMENT.STEP must be a positive value`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (CONFIG.INVESTMENT.MIN > CONFIG.INVESTMENT.MAX) {
        const msg = `INVESTMENT.MIN cannot be greater than INVESTMENT.MAX`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if ((CONFIG.INVESTMENT.MIN !== CONFIG.INVESTMENT.MAX) && (CONFIG.INVESTMENT.MAX - CONFIG.INVESTMENT.MIN) / CONFIG.INVESTMENT.STEP < 1) {
        const msg = `Not enough steps between INVESTMENT.MIN and INVESTMENT.MAX using step size of ${CONFIG.INVESTMENT.STEP}`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (CONFIG.TRADING.WHITELIST.length > 0 && !CONFIG.TRADING.WHITELIST.includes(CONFIG.INVESTMENT.BASE)) {
        const msg = `Whitelist must include the base symbol of ${CONFIG.INVESTMENT.BASE}`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.debug(`Whitelist: [${CONFIG.TRADING.WHITELIST}]`);
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (CONFIG.TRADING.EXECUTION_STRATEGY.toLowerCase() === 'parallel' && CONFIG.TRADING.WHITELIST.length === 0) {
        const msg = `Parallel execution requires defining a whitelist`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (!VALID_VALUES.TRADING.EXECUTION_STRATEGY.includes(CONFIG.TRADING.EXECUTION_STRATEGY.toLowerCase())) {
        const msg = `${CONFIG.TRADING.EXECUTION_STRATEGY} is an invalid execution strategy`;

        logger.execution.error(msg);

        throw new Error(msg);
    }
    if (CONFIG.TRADING.TAKER_FEE < 0) {
        const msg = `Taker fee (${CONFIG.TRADING.TAKER_FEE}) must be a positive value`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (CONFIG.DEPTH.SIZE > 100 && CONFIG.TRADING.WHITELIST.length === 0) {
        const msg = `Using a depth size higher than 100 requires defining a whitelist`;

        if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
            logger.execution.error(msg);
        }

        throw new Error(msg);
    }
    if (!VALID_VALUES.DEPTH.SIZE.includes(CONFIG.DEPTH.SIZE)) {
        const msg = `Depth size can only contain one of the following values: ${VALID_VALUES.DEPTH.SIZE}`;
        logger.execution.error(msg);
        throw new Error(msg);
    }
}

function checkBalances() {
    if (!CONFIG.TRADING.ENABLED) return;

    if ((CONFIG.DEMO == 'undefined') || !CONFIG.DEMO) {
        console.log(`Checking balances ...`);

        if (ArbitrageExecution.balances[CONFIG.INVESTMENT.BASE].available < CONFIG.INVESTMENT.MIN) {
            const msg = `Only detected ${ArbitrageExecution.balances[CONFIG.INVESTMENT.BASE].available} ${CONFIG.INVESTMENT.BASE}, but ${CONFIG.INVESTMENT.MIN} ${CONFIG.INVESTMENT.BASE} is required to satisfy your INVESTMENT.MIN configuration`;
            logger.execution.error(msg);
            throw new Error(msg);
        }
        if (ArbitrageExecution.balances[CONFIG.INVESTMENT.BASE].available < CONFIG.INVESTMENT.MAX) {
            const msg = `Only detected ${ArbitrageExecution.balances[CONFIG.INVESTMENT.BASE].available} ${CONFIG.INVESTMENT.BASE}, but ${CONFIG.INVESTMENT.MAX} ${CONFIG.INVESTMENT.BASE} is required to satisfy your INVESTMENT.MAX configuration`;
            logger.execution.error(msg);
            throw new Error(msg);
        }
    }
}

function refreshHUD(arbs) {
    const arbsToDisplay = Object.values(arbs)
        .sort((a, b) => a.percent > b.percent ? -1 : 1)
        .slice(0, CONFIG.HUD.ARB_COUNT);
    HUD.displayArbs(arbsToDisplay);
}
