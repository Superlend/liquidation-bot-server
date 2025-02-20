# Superlend Liquidation Bot

An automated liquidation bot for the Aave protocol that monitors positions, identifies liquidation opportunities, and executes profitable liquidations using flash loans and DEX swaps.

## Overview

This service continuously monitors Aave positions, identifying accounts that have fallen below the required health factor. When profitable liquidation opportunities are found, it:

1. Calculates the optimal liquidation amount
2. Determines the best DEX route for token swaps
3. Executes the liquidation using flash loans
4. Swaps the received collateral for profit

## Features

- **Automated Monitoring**: Periodically checks for liquidatable positions
- **Multi-RPC Support**: Failover capability with primary and backup RPC nodes
- **Profit Calculation**: Considers liquidation bonuses, DEX fees, and gas costs
- **Smart Routing**: Uses IguanaDEX's smart router for optimal token swaps
- **Concurrent Execution Prevention**: Ensures only one liquidation process runs at a time
- **Comprehensive Logging**: Detailed logging of all operations and errors

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Access to Etherlink RPC nodes
- Wallet with sufficient funds for gas
- Yarn package manager

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd liquidation-bot
```

2. Install dependencies:

```bash
yarn install
```

3. Create and configure the environment file:

```bash
cp .env.sample .env
```

## Configuration

Edit the `.env` file with your settings:

```env
# Node URLs
NODE_URL_PRIMARY=<your-primary-rpc-url>
NODE_URL_BACKUP=<your-backup-rpc-url>

# Database
DB_URL=postgresql://<user>:<password>@<host>:<port>/<database>

# Blockchain
CHAIN_ID=<target-chain-id>
PRIVATE_KEY=<liquidator-wallet-private-key>

# Scheduling
LIQUIDATION_CRON_EXPRESSION="*/5 * * * *"  # Runs every 5 minutes
```

## Database Setup

The service requires a PostgreSQL database with a table for tracking liquidatable positions:
This table is being setup by the [liquidation-indexer](https://github.com/Superlend/liquidation-bot-indexer)

## Running the Service

```bash
# development mode
yarn run start:dev

# production mode
yarn run build
yarn run start:prod

# watch mode
yarn run start
```

## Architecture

The service consists of several key components:

- **SchedulerService**: Manages the periodic execution of liquidation checks
- **LiquidationService**: Core logic for processing liquidation opportunities
- **RpcService**: Handles blockchain interactions and DEX operations
- **RepoService**: Manages database operations for tracking positions

## Monitoring

The service uses Winston for logging. All operations and errors are logged with appropriate context and stack traces when applicable.

Logs include:

- Liquidation opportunities found
- Execution attempts and results
- RPC failovers
- Database operations
- Error conditions

## Security Considerations

- Secure storage of private keys
- RPC node reliability and security
- Database access controls
- Gas price management
