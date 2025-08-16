# 🛡️ Sentinel - AI-Powered Financial Security Platform

> **Real-time fraud detection and security monitoring powered by artificial intelligence**

[![Next.js](https://img.shields.io/badge/Next.js-15.3.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-FF6B6B?style=for-the-badge&logo=openai)](https://openai.com/)
[![Security](https://img.shields.io/badge/Security-Critical-red?style=for-the-badge&logo=shield)](https://en.wikipedia.org/wiki/Computer_security)

## 🎯 Overview

Sentinel is an enterprise-grade financial security platform that combines real-time monitoring, AI-powered threat detection, and comprehensive fraud prevention. Built to combat modern financial crimes including SIM swapping attacks, our platform provides proactive security that adapts and learns from every interaction.

## ✨ Key Features

### 🚨 **Real-Time Security Monitoring**

- **Live Dashboard** - Security metrics update every 30 seconds automatically
- **Threat Level Assessment** - Real-time security scoring and threat classification
- **Transaction Monitoring** - Continuous payment pattern analysis
- **Device Security Analysis** - Comprehensive endpoint security assessment

### 🤖 **AI-Powered Security Assistant**

- **Intelligent Chat Interface** - Natural language security queries and responses
- **Fraud Pattern Recognition** - Machine learning-based threat detection
- **Risk Assessment** - AI-driven payment risk analysis
- **Security Recommendations** - Proactive security improvement suggestions

### 🔐 **Advanced Authentication & Security**

- **Multi-Factor Authentication** - Email/password + Google OAuth support
- **Better Auth Integration** - Enterprise-grade authentication framework
- **Secure Session Management** - Protected routes and user validation
- **Real-Time Security Alerts** - Instant notification of suspicious activity

### 📊 **Comprehensive Analytics**

- **Security Score Tracking** - Visual security health indicators
- **Fraud Detection Metrics** - Real-time threat statistics
- **Transaction Analytics** - Payment pattern insights and trends
- **Performance Monitoring** - System health and response time tracking

## 🏗️ Architecture

```
Sentinel/
├── apps/
│   └── web/                    # Full-stack Next.js application
│       ├── src/
│       │   ├── app/            # App router pages and API routes
│       │   ├── components/     # Reusable UI components
│       │   ├── lib/            # Utility functions and configurations
│       │   ├── hooks/          # Custom React hooks
│       │   ├── providers/      # Context providers and state management
│       │   └── db/             # Database schema and configurations
│       ├── public/             # Static assets and PWA files
│       └── .env                # Environment configuration
├── package.json                 # Root dependencies and scripts
└── turbo.json                   # Monorepo build configuration
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) 1.0+
- [PostgreSQL](https://www.postgresql.org/) database
- Google OAuth credentials (for authentication)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/sentinel.git
   cd sentinel
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Environment Setup**

   ```bash
   cd apps/web
   cp .env.example .env
   ```

   Configure your `.env` file:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/sentinel"
   BETTER_AUTH_SECRET="your-secret-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

4. **Database Setup**

   ```bash
   bun db:push
   ```

5. **Start Development Server**

   ```bash
   bun dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Technology Stack

### **Frontend**

- **Next.js 15** - Full-stack React framework with App Router
- **TypeScript** - Type-safe development experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Professional UI component library
- **Radix UI** - Accessible component primitives

### **Backend & Database**

- **Next.js API Routes** - Serverless API endpoints
- **PostgreSQL** - Robust relational database
- **Drizzle ORM** - TypeScript-first database toolkit
- **Better Auth** - Enterprise authentication framework

### **AI & Intelligence**

- **AI SDK** - Google AI and Groq integration
- **Machine Learning** - Pattern recognition and threat detection
- **Real-time Processing** - WebSocket-based live updates
- **Natural Language Processing** - AI chat interface

### **Development & Deployment**

- **Turborepo** - Optimized monorepo build system
- **Bun** - Fast JavaScript runtime and package manager
- **ESLint & Prettier** - Code quality and formatting
- **Vercel** - Production deployment platform

## 📱 Progressive Web App

Sentinel includes full PWA support:

- **Offline Capability** - Core functionality works without internet
- **App-like Experience** - Native mobile app feel
- **Push Notifications** - Real-time security alerts
- **Installable** - Add to home screen on mobile devices

## 🔒 Security Features

### **Fraud Detection**

- **SIM Swapping Protection** - Advanced detection of phone number hijacking
- **Payment Risk Assessment** - Real-time transaction analysis
- **Behavioral Analysis** - User pattern monitoring
- **Threat Intelligence** - Up-to-date threat database integration

### **Data Protection**

- **End-to-End Encryption** - Secure data transmission
- **GDPR Compliance** - Privacy-focused data handling
- **Audit Logging** - Comprehensive security event tracking
- **Secure API** - Rate limiting and authentication

## 📊 Dashboard Features

### **Security Overview**

- Real-time security score (0-100)
- Threat level classification (Normal, Elevated, High, Critical)
- Active security alerts and notifications
- System health indicators

### **Transaction Monitoring**

- Live payment transaction feed
- Fraud detection alerts
- Payment pattern analysis
- Risk scoring for individual transactions

### **AI Agent Interface**

- Natural language security queries
- Real-time threat analysis
- Security recommendations
- Interactive security guidance

## 🚀 Deployment

### **Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Self-Hosted**

```bash
# Build the application
bun build

# Start production server
bun start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Workflow**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.sentinel.com](https://docs.sentinel.com)
- **Issues**: [GitHub Issues](https://github.com/your-username/sentinel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/sentinel/discussions)
- **Email**: support@sentinel.com

## 🙏 Acknowledgments

- Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Charts from [Recharts](https://recharts.org/)

---

**Made with ❤️ by the Sentinel Team**

_Protecting your financial future with AI-powered security_
