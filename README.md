# Paycrypt Backend - Comprehensive Documentation

## 📋 Overview

Paycrypt is a multi-chain cryptocurrency payment system that enables users to purchase utility services (airtime, internet, electricity, TV) using stablecoins across three blockchain networks: **Base**, **Lisk**, and **Celo**.

---

## 🏗️ System Architecture

### Core Components

```
Paycrypt Backend
├── API Layer (Next.js Routes)
├── Database (MongoDB)
├── Blockchain Integration (Web3)
├── Payment Processing (VTPass API)
└── Sync Services (Cron Jobs)
```

### Supported Networks

| Network | Chain ID | Contract Address | Status |
|---------|----------|------------------|--------|
| Base | 8453 | 0x0574A0941Ca659D01CF7370E37492bd2DF43128d | ✅ Active |
| Lisk | 1135 | 0x7Ca0a469164655AF07d27cf4bdA5e77F36Ab820A | ✅ Active |
| Celo | 42220 | 0x8CD2295407B9429286457e76848edeE6d1c257f2 | ✅ Active |

---

## 💳 Supported Stablecoins

### Base Chain
- USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- USDT (0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2)
- SEND (0xeab49138ba2ea6dd776220fe26b7b8e446638956)

### Lisk Chain
- USDT (0x05D032ac25d322df992303dCa074EE7392C117b9)
- USDC (0xF242275d3a6527d877f2c927a82D9b057609cc71)

### Celo Chain
- cUSD (0x765DE816845861e75A25fCA122bb6898B8B1282a)
- CELO (0x471EcE3750Da237f93B8E339c536989b8978a438)
- USDT (0x617f3112bf5397D0467D315cC709EF968D9ba546)
- USDC (0xef4229c8c3250C675F21BCefa42f58EfbfF6002a)

---

## 🔄 Transaction Flow

### Payment Process (User Perspective)

```
1. User selects service (Airtime, Internet, Electricity, TV)
2. Chooses blockchain network (Base, Lisk, or Celo)
3. Selects stablecoin payment method
4. Approves token transfer on blockchain
5. System creates order in database
6. Payment is processed through VTPass API
7. Utility service is activated (airtime credited, etc.)
8. Transaction receipt is generated
```

### Backend Processing

```
API Request
    ↓
Validate Request Data
    ↓
Check/Store Order in MongoDB
    ↓
Process Payment via VTPass
    ↓
Update Order Status
    ↓
Return Response to Frontend
```

---

## 📊 Database Schema

### Order Model

Each transaction is recorded with:

```javascript
{
  requestId: String,           // Unique request identifier
  userAddress: String,          // Customer wallet address
  transactionHash: String,      // Blockchain transaction ID
  serviceType: String,          // 'airtime' | 'internet' | 'electricity' | 'tv'
  serviceID: String,            // Provider service ID
  variationCode: String,        // Service variation (e.g., plan type)
  customerIdentifier: String,   // Phone number or meter number
  amountNaira: Number,          // Amount in Nigerian Naira
  cryptoUsed: String,           // Token used (e.g., USDC)
  cryptoSymbol: String,         // Token symbol
  chainId: Number,              // 8453 (Base), 1135 (Lisk), or 42220 (Celo)
  chainName: String,            // 'Base', 'Lisk', or 'Celo'
  onChainStatus: String,        // 'confirmed' | 'failed'
  vtpassStatus: String,         // 'pending' | 'successful' | 'failed'
  createdAt: Date,              // Order creation timestamp
  updatedAt: Date               // Last update timestamp
}
```

---

## 🔌 API Endpoints

### Payment Services

#### Airtime Purchase
```
POST /api/airtime
{
  requestId, billersCode, serviceID, variation_code,
  amount, phone, cryptoUsed, cryptoSymbol, 
  transactionHash, userAddress, chainId, chainName
}
```

#### Internet/Data Purchase
```
POST /api/internet
{
  requestId, billersCode, serviceID, variation_code,
  amount, phone, cryptoUsed, cryptoSymbol,
  transactionHash, userAddress, chainId, chainName
}
```

#### Electricity Purchase
```
POST /api/electricity
{
  requestId, meterNumber, serviceID, variation_code,
  amount, phone, cryptoUsed, cryptoSymbol,
  transactionHash, userAddress, chainId, chainName
}
Response includes: prepaidToken (meter reading details)
```

#### TV Subscription
```
POST /api/tv
{
  requestId, billersCode, serviceID, variation_code,
  amount, phone, cryptoUsed, cryptoSymbol,
  transactionHash, userAddress, chainId, chainName
}
```

### Data Retrieval

#### Transaction History
```
GET /api/history?userAddress=0x...&chainId=8453
Returns: All transactions for a user, optionally filtered by chain
```

#### Health Check (Includes Migration)
```
GET /api/health
Returns: API status and runs any pending data migrations
```

---

## 🔄 Automatic Migrations

### Migration System

When the backend starts, it automatically:

1. **Checks Database Connection** - Ensures MongoDB is accessible
2. **Runs Migration** - Updates old orders without chain information
3. **Logs Progress** - Provides detailed migration logs
4. **Continues Operation** - Doesn't block the API from running

### Historical Data Migration

**Target**: All orders created before **December 3, 2025, 12:28:31 AM**
**Action**: Automatically assigned to Base chain (chainId: 8453)
**Status**: Non-blocking (runs in background on first health check)

---

## 📈 Monitoring & Sync Services

### Running Services

1. **Health Check** (Every 5 minutes)
   - Verifies API availability
   - Runs pending migrations

2. **Metrics Sync** (Every 30 minutes)
   - Fetches order counts from smart contracts
   - Tracks total volume across chains
   - Stores metrics in database

3. **Order History Sync** (Every 30 minutes)
   - Syncs blockchain events to database
   - Updates transaction status
   - Processes new orders from contracts

4. **Token Volume Sync** (Every 30 minutes)
   - Calculates total USD value across all chains
   - Converts to NGN (Nigerian Naira)
   - Updates supported token list

---

## 📊 Current Statistics

### Orders by Chain
- **Base**: 168 orders (141 successful, 23 failed)
- **Lisk**: 1 order (1 successful, 0 failed)
- **Celo**: 4 orders (3 successful, 1 failed)
- **Total**: 173 orders

---

## 🛡️ Security Features

### Data Validation
- ✅ All required fields validated
- ✅ Address checksums verified
- ✅ Transaction hash validation

### Rate Limiting
- ⚠️ Subject to RPC provider rate limits
- 📍 Currently experiencing occasional "over rate limit" errors
- ✅ Errors are logged but don't stop operation

### CORS Handling
- ✅ Cross-origin requests properly handled
- ✅ Preflight requests supported
- ✅ Frontend can safely communicate with backend

---

## 🐛 Known Issues & Solutions

### 1. RPC Rate Limiting
**Problem**: "Over rate limit" errors when fetching token details

**Impact**: Temporary delays in token sync, doesn't affect transactions

**Solution**: Uses multiple RPC providers, retries automatically

### 2. Email Configuration
**Problem**: Email service timeout on startup

**Impact**: Notifications may not send initially

**Solution**: Service continues running, email can be reconfigured

---

## 📝 Environment Variables Required

```env
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_RPC_BASE=https://...
NEXT_PUBLIC_RPC_LISK=https://...
NEXT_PUBLIC_RPC_CELO=https://...
VTPASS_API_KEY=...
```

---

## 🚀 Deployment

### How It Works on Render

1. **Code Pushed** → GitHub repository updated
2. **Build Starts** → Dependencies installed, app compiled
3. **Server Starts** → Node.js server begins running
4. **Migrations Run** → Database updates happen automatically
5. **Cron Jobs Start** → Sync services begin scheduled tasks
6. **Ready** → API accepts requests

### Health Check Setup

Configure in Render dashboard:
- **Health Check Path**: `/api/health`
- **Check Interval**: Every 5 minutes
- **Timeout**: 10 seconds

---

## 📁 Project Structure

```
Paycrypt-backend/
├── app/
│   └── api/
│       ├── airtime/route.js           # Airtime purchase endpoint
│       ├── internet/route.js           # Internet purchase endpoint
│       ├── electricity/route.js        # Electricity purchase endpoint
│       ├── tv/route.js                 # TV subscription endpoint
│       ├── health/route.js             # Health check + migration
│       └── history/route.js            # Transaction history
├── lib/
│   ├── migrations.js                   # Automatic migration logic
│   ├── order-service.js                # Order CRUD operations
│   ├── vtpassService.js                # VTPass API integration
│   └── cors.js                         # CORS handling
├── models/
│   └── order.js                        # MongoDB Order schema
├── utils/
│   └── errorHandler.js                 # Error handling utilities
├── db/
│   └── index.js                        # MongoDB connection
├── config/
│   └── index.js                        # Configuration
├── next.config.js                      # Next.js configuration
└── README.md                           # This file
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: Orders not appearing in history?**
- Check that `chainId` and `chainName` are being sent correctly
- Verify user address is lowercase

**Q: Payment failing on specific chain?**
- Verify stablecoin balance on that chain
- Check token approval amount
- Ensure chain is selected correctly

**Q: Migration not running?**
- Call `/api/health` endpoint to trigger manually
- Check Render logs for migration status

**Q: RPC rate limit errors?**
- These are temporary and don't affect transactions
- Check the logs - errors will show "over rate limit"
- System automatically retries

---

## 🔧 Development

### Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Get transaction history
curl "http://localhost:3000/api/history?userAddress=0x..."

# Test airtime purchase (POST)
curl -X POST http://localhost:3000/api/airtime \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

## 📈 Future Enhancements

- [ ] Add more blockchain networks
- [ ] Support additional payment tokens
- [ ] Implement transaction retry logic
- [ ] Add webhook notifications
- [ ] Enhanced analytics tracking
- [ ] Multi-language support

---

## 📄 License

This project is proprietary. All rights reserved.

---

**Last Updated**: December 9, 2025  
**System Status**: ✅ All 3 chains operational | ✅ 173 orders processed | ✅ Migrations automated  
**Support**: support@paycrypt.org
