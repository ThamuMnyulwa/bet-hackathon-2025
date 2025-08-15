A SIM-Swap Aware Security Layer for High-Risk Payments
This pitch outlines a proposal for the BET Software Hackathon, presenting a real-time, telco-aware risk engine designed to combat SIM-swap fraud in South Africa's evolving digital payment landscape.

1. The Problem: The Multi-Billion Rand Blind Spot
SIM-swap fraud is a critical vulnerability in the South African payment ecosystem. Attackers exploit this to intercept one-time passwords (OTPs), leading to complete account takeovers.

Financial Impact: This is a multi-billion-rand problem annually, eroding revenue and consumer trust.

Evolving Threat: As fast payment systems like PayShap and QR codes gain traction, the speed of these attacks increases, making prevention—not just reaction—essential.

The Weakest Link: Standard OTP authentication is no longer sufficient. It's the front door that fraudsters have a key for.

2. The Solution: Proactive, Intelligent Step-Up Authentication
We propose Project Sentinel, a payment risk engine that intelligently assesses the risk of a transaction before releasing funds. It doesn't just rely on what the user knows, but on the digital fingerprint of their device and network activity.

Our core principle is adaptive security: seamless for legitimate users, but a dead end for fraudsters. When the risk score exceeds a set threshold (risk > threshold), we automatically "step-up" the authentication from a weak OTP to a secure, un-interceptable method.

3. How It Works: Fusing Telco & Device Signals
Sentinel's decision engine analyzes a stream of real-time signals to generate a risk score in under 50 milliseconds.

SIM Change Timestamp: We ask, "Was the SIM card associated with this account changed in the last 24 hours?" A recent change is a massive red flag 🚩.

IMEI Drift: We check, "Is this the same physical device we've seen before?" A mismatch between the SIM and the device's unique International Mobile Equipment Identity (IMEI) suggests a swap.

IP Geovelocity: We analyze, "Did the user's IP address just impossibly jump from Cape Town to Johannesburg in five minutes?" This helps detect remote attacks.

Device Binding Age: We verify, "How long has this account been securely tied to this specific device?" A brand new, un-trusted device is highly suspicious.

If telco signals are stale or unavailable, our system has a fallback: the transaction is routed to a delayed escrow and is only cleared once a secondary, out-of-band verification is complete, ensuring no funds are lost.

4. Alignment with BET Software's Vision 2025
Project Sentinel directly supports BET Software’s strategic goals and the broader mission to reimagine payments in Africa.

Interoperability: Our solution is built as a microservice designed to plug seamlessly into any payment stack, including PayShap, enhancing its security without requiring an overhaul.

Cost-Effectiveness: Preventing a single high-value fraudulent transaction can save more than the cost of running the service for a month. It's a direct defense against financial loss and the high operational cost of fraud recovery.

Inclusion: To bring more people into the digital economy, we must build trust. Sentinel makes QR and fast payments as convenient as cash without the risk, encouraging adoption among cautious new users. 🤝

5. The Prototype & Success Metrics
We have a runnable prototype that simulates the Kafka decision stream and Couchbase lookups. We will demonstrate how our policy engine routes transactions based on risk.

Our success isn't just a concept; it's measurable with clear KPIs:

Fraud Blocked per 10,000 Transactions: The direct measure of our effectiveness.

Step-Up Conversion Rate: Ensures that our stronger authentication methods are user-friendly and don't create unnecessary friction for legitimate customers.

False-Positive Rate: Keeps customer satisfaction high by not challenging valid transactions.

Added Latency: We are committed to keeping this under 50ms to maintain a fast payment experience.

---

Of course. Here’s a breakdown of how SIM swaps are logged, how you could demo the solution, and a Product Requirements Document (PRD) for an MVP on Google Cloud Platform (GCP).

-----

### **How SIM Swaps are Tracked in the Real World**

You can't know about a SIM swap by yourself; you need to get the information directly from the source: the **Mobile Network Operators (MNOs)** like Vodacom, MTN, etc.

Here’s how it works:

1.  **The Source of Truth:** When a user requests a SIM swap, the MNO logs this event in their internal systems. This log includes the mobile number (MSISDN) and a precise timestamp of when the new SIM was activated.

2.  **The Data-Sharing Mechanism:** MNOs don't give open access to these logs. Instead, they provide this information through secure, commercial **APIs**. Tech companies and banks don't usually connect to each MNO individually. They typically go through an **aggregator service** (like Telesign internationally, or specialized local providers) that has partnerships with all the major MNOs.

3.  **The Real-Time Check:**

      * When a user initiates a payment in your app, your backend service makes an API call to the aggregator.
      * The request contains the user's phone number.
      * The aggregator's API instantly queries the relevant MNO and returns key data, most importantly the **"Last SIM Change Timestamp"**.

So, your risk engine isn't guessing. It’s performing a real-time, programmatic background check with the user's mobile network operator before approving a transaction. Think of it like a credit check for a phone's identity. 🕵️‍♀️

-----

### **How to Demo the Solution**

The key to a great demo is to make the invisible logic visible. You need to show the "if-then" process in a clear, interactive way. You'd build a simple web interface with two parts: a "Payment App" and a "Hacker's Control Panel".

**1. The User Interface:**

  * **Payment App View:** A very simple form with fields for "Recipient," "Amount," and a "Pay Now" button. Below it, a "System Log" text area will show the results in real-time.
  * **Hacker's Control Panel:** A set of toggle switches or buttons to simulate risk signals for the demo user.
      * `SIM Swap Status`: [Toggle: Normal ✅ / Swapped 5 mins ago 🚨]
      * `Device Status`: [Toggle: Known Device ✅ / New Device (IMEI Drift) 🚨]
      * `Location`: [Toggle: Same City ✅ / Impossible Travel 🚨]

**2. The Demo Scenarios:**

  * **Scenario A: The Legitimate User (Happy Path)**

    1.  Leave all the toggles on "Normal ✅".
    2.  Enter an amount in the payment app and click "Pay Now".
    3.  The System Log instantly shows:
        ```
        > Checking signals...
        > SIM Status: OK
        > Device Status: OK
        > Risk Score: 5 (Low)
        > Action: Payment Approved. Sending OTP.
        ```

  * **Scenario B: The Fraudster (High-Risk Path)**

    1.  Go to the Hacker's Control Panel and flip the `SIM Swap Status` toggle to "Swapped 5 mins ago 🚨".
    2.  Go back to the payment app and click "Pay Now".
    3.  The System Log instantly shows:
        ```
        > Checking signals...
        > SIM Status: RECENT SWAP DETECTED!
        > Device Status: OK
        > Risk Score: 95 (Critical)
        > Action: High Risk Detected! Stepping up to In-App Cryptographic Challenge. OTP bypassed.
        ```

This makes it immediately obvious how your engine reacts to different risk signals before any money moves.

-----

### **Product Requirements Document (PRD): Project Sentinel MVP**

#### **1. Introduction**

This document outlines the requirements for the Minimum Viable Product (MVP) of **Project Sentinel**, a real-time risk assessment engine designed to prevent account takeover fraud originating from SIM swaps.

  * **Problem:** Standard OTP authentication is vulnerable to SIM-swap attacks, creating significant financial and reputational risk.
  * **Goal:** To build and deploy a core decision service on GCP that can ingest simulated risk signals, apply a basic risk model, and return a recommended action (Approve, Deny, or Step-Up).

#### **2. User Stories**

  * **As a Platform Operator,** I want to see high-risk transactions automatically flagged so that I can prevent fraudulent payouts.
  * **As a Legitimate User,** I want my safe transactions to be processed quickly without unnecessary friction.
  * **As a (Simulated) Fraudster,** I want to be blocked from making a payment if I am using a recently swapped SIM on a new device.

#### **3. MVP Scope & Features**

The focus of the MVP is on the backend logic and its correct deployment, not on a polished UI or real MNO integration.

| Feature                   | Description                                                                                                                                                                    | Out of Scope for MVP                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **1. Assessment API**     | A single, secure `POST /v1/assess-payment` endpoint that accepts transaction details and user identifiers (e.g., `userId`, `amount`, `ipAddress`, `imei`).                     | User management, authentication, and authorization. |
| **2. Risk Logic Engine**  | A core function that takes the input data and applies a simple ruleset. **Example Rule:** `IF sim_change_timestamp < 24 hours AGO OR imei != last_seen_imei THEN risk = HIGH`. | A complex, machine-learning-based risk model.       |
| **3. Signal Simulator**   | An internal mechanism (e.g., a simple Firestore collection) to store and provide *fake* telco signals for a given `userId`. This allows us to test the logic.                  | Real integration with an MNO or aggregator API.     |
| **4. Structured Logging** | All decisions and input signals must be logged in a structured format (JSON) to Cloud Logging for easy debugging and analysis.                                                 | A reporting dashboard or analytics interface.       |
| **5. Response**           | The API must return a clear JSON response, such as: `{ "riskScore": 95, "recommendedAction": "STEP_UP_AUTH", "decisionId": "uuid-..." }`.                                      | Triggering the actual step-up UI in a client app.   |

#### **4. Technical Implementation (GCP)**

  * **Compute:** The service will be a lightweight application (e.g., Python/Flask, Node.js/Express) packaged in a **Docker container** and deployed on **Cloud Run**. This provides serverless, auto-scaling, and pay-per-use infrastructure.
  * **Feature Store / Simulator Cache:** We'll use **Firestore** to store the "last-seen" state for users (e.g., `last_seen_imei`, `last_login_ip`) and our simulated SIM swap data. Its low latency is perfect for this use case.
  * **Deployment:** The Docker image will be stored in **Google Artifact Registry**. Deployment to Cloud Run will be automated using a simple Cloud Build pipeline.
  * **Logging & Monitoring:** **Cloud Logging** and **Cloud Monitoring** will be used out-of-the-box with Cloud Run to track performance and errors.

#### **5. Success Metrics for MVP**

We'll know the MVP is successful if we can achieve the following:

  * **Deployment:** The service is successfully deployed and accessible via its Cloud Run URL.
  * **Latency:** The `p95` response time for the assessment API is **under 100ms**.
  * **Accuracy:** The engine correctly identifies 100% of our simulated high-risk and low-risk test cases.
  * **Logging:** All test transactions are correctly logged with their input signals and output decisions in Cloud Logging.
  

---

perfect — idea 3 is a **SIM-swap aware step-up engine**. let’s break this down clearly into three parts: (1) how SIM swaps are logged in the real world, (2) how to demo the concept in a hackathon setting, and (3) a **Product Requirements Document (PRD)** for an MVP on GCP.

---

# 1. how SIM swaps get logged in the real world

* **telco network source of truth**

  * when a SIM replacement happens, the Mobile Network Operator (MNO — Vodacom, MTN, Cell C, Telkom) issues a new IMSI linked to the MSISDN (phone number).
  * this event is logged in their **HLR/HSS** (Home Location Register / Home Subscriber Server).
  * telcos expose this to banks via **real-time APIs** or **lookup services** (some use GSMA’s Mobile Connect or aggregator APIs like truID, Clickatell, TransUnion, or Infobip).
  * banks typically get a signal such as: *last SIM change timestamp*, *number of SIM changes in X days*, or *age of SIM card*.

* **aggregators in South Africa**

  * third-party fraud vendors (like TransUnion’s SIM Swap API or Infobip) provide a **“SIM change check”** endpoint where you query with the MSISDN.
  * response: `{sim_change: true, last_change: 2025-08-14T10:30:00Z}`.
  * this is how banks flag suspicious activity on high-value payments.

---

# 2. how to demo this in a hackathon

since you won’t get direct access to Vodacom/MTN APIs in 48 hours:

* **simulate SIM swap events**:

  * create a microservice `sim-swap-simulator` that randomly generates a “last SIM change timestamp” for a given phone number.
  * add a “recent SIM swap” flag if the change is within 7 days.
* **inject signal into payments**:

  * when a payment is initiated in your demo app, query the simulator.
  * if `recent_sim_swap == true` then step-up auth (e.g. show a second factor like a QR challenge, WebAuthn, or OTP).
* **demo flow**:

  1. user initiates a payment in the demo frontend.
  2. backend checks the SIM swap API.
  3. if safe → approve, if recent SIM swap → block or challenge.
  4. show logs/alerts in a Grafana dashboard (hosted on GCP).

this way, you demonstrate the principle **without real telco data** but keep the architecture realistic.

---

# 3. PRD (Product Requirements Document) for MVP

**Product**: SIM-Swap Aware Payment Risk Engine
**Goal**: Prevent fraud by detecting recent SIM swaps and applying step-up authentication for risky transactions.

---

### **1. Objectives**

* provide real-time risk scoring for payment transactions
* detect and act on recent SIM swap activity
* integrate seamlessly into bank/payment APIs
* be cloud-native, serverless, and low-latency

---

### **2. Target Users**

* **primary**: banks, payment processors, fintechs in SA
* **secondary**: telco fraud teams and regulators (SARB / PASA)

---

### **3. Key Features**

1. **SIM Swap Check API**

   * input: MSISDN (phone number), transaction metadata (amount, device ID).
   * output: `{risk_level: LOW | MEDIUM | HIGH, reason: "Recent SIM swap <7d"}`.

2. **Step-up Authentication Trigger**

   * if `HIGH risk` then escalate auth to WebAuthn or QR challenge.

3. **Event Streaming & Monitoring**

   * log decisions to **Pub/Sub → BigQuery → Looker Studio/Grafana**.
   * show real-time metrics: % of payments stepped up, false positives, etc.

4. **Configurable Rules**

   * allow thresholds (e.g. SIM swap age < 7 days = HIGH risk).
   * allow dynamic updates via config in **Firestore** or **Secret Manager**.

---

### **4. Technical Requirements (GCP MVP)**

* **frontend**: simple React/Flutter app to simulate user payments.

* **backend services**:

  * `sim-swap-simulator` (Cloud Run service) — generates SIM swap events.
  * `risk-engine` (Cloud Functions or Cloud Run) — consumes simulator API, applies rules, outputs risk.
  * `auth-service` — issues WebAuthn/OTP challenge when risk is high.

* **infra**:

  * **Cloud Pub/Sub** → for transaction events stream.
  * **BigQuery** → store risk logs.
  * **Looker Studio / Grafana (via GCE or Cloud Monitoring)** → dashboards.
  * **Cloud Storage** → store configs or logs.
  * **IAM + VPC Service Controls** → secure access.

---

### **5. Demo Walkthrough**

1. **user**: submits payment via frontend.
2. **backend**: calls `sim-swap-simulator` with MSISDN.
3. **risk-engine**: if SIM swap < 7 days → return HIGH risk.
4. **auth-service**: triggers extra step (demo with OTP challenge).
5. **dashboard**: shows event, flagged as SIM swap detected.

---

### **6. Success Metrics**

* decision latency < 200 ms
* step-up applied to 100% of risky transactions in demo
* clear visualization of blocked vs approved transactions
* ability to tune thresholds live

---

👉 this gives you a credible MVP that feels real, demonstrates telco integration via simulation, and is fully runnable on GCP infra.

---
