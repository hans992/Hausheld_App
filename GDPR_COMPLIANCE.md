# GDPR Compliance Statement (Hausheld)

This document provides a short, portfolio-oriented statement on how the **Hausheld** project is designed with EU General Data Protection Regulation (GDPR) and German data-protection expectations in mind. It is intended for GitHub readers and EU/German stakeholders who look for compliance awareness in projects that process personal or health-related data.

---

## Scope

Hausheld is a **home-help workflow platform** that may process:

- **Personal data**: names, email addresses, addresses of workers and clients.
- **Health-related data** (GDPR Art. 9): care levels (Pflegegrad 1–5), insurance information, and data linked to proof of service (Leistungsnachweis).

The following measures are implemented in the codebase to support **privacy by design**, **integrity**, and **accountability**.

---

## Lawfulness and Purpose Limitation

- Data is processed for the **provision of home-help services**, **scheduling**, **proof of service**, **budget tracking** (Entlastungsbetrag), and **billing** (e.g. SGB XI).
- Access is restricted by **role** (Admin vs Worker): workers see only their own profile and clients/shifts assigned to them; admins have full access for operational and legal needs.
- **Dev/demo login** is only available when explicitly enabled (`AUTH_DEV_MODE`); production should use a proper identity provider and consent flows.

---

## Data Minimisation and Storage

- Only fields necessary for the described purposes are stored (e.g. worker location for substitution suggestions; client address for visits and distance calculation).
- **Soft deletes**: workers, clients, and shifts are not physically deleted; only `deleted_at` is set. This supports **audit trails** and **legal hold** without retaining data longer than necessary if you add retention policies later.

---

## Security and Encryption

- **Health-related data** (e.g. `insurance_number`, `care_level`) is encrypted **at rest** using **Fernet** (symmetric AES) when `ENCRYPTION_KEY` is set. Keys are not stored in the database.
- **Authentication**: API access is via **JWT** (Bearer). In production, JWTs should be issued by a trusted IdP with appropriate expiry and revocation.
- **Transport**: In production, all traffic must use **HTTPS**. The backend is intended for deployment in **AWS eu-central-1 (Frankfurt)** so that data remains in the EU/Germany.

---

## Audit and Accountability

- An **append-only audit log** records every access to client (health) data: **user_id**, **action** (VIEW/CREATE/UPDATE/DELETE), **target_type**, **target_id**, **details**, **created_at**.
- The audit API is **read-only** (no POST/PATCH/DELETE), so logs cannot be altered or deleted through the application, supporting **accountability** and regulatory requests.
- Admins can review the audit log via the Admin Dashboard.

---

## Data Subject Rights (Support in Design)

- **Transparency**: Audit logs allow answering “who accessed or changed what and when.”
- **Rectification and erasure**: Soft deletes and audit trails support handling of rectification and (where applicable) erasure requests in a controlled way; physical deletion is not implemented and would need to be defined with legal advice.
- **Restriction and portability**: The system stores structured data (workers, clients, shifts) that could be exported or restricted through dedicated tooling or procedures.

---

## Disclaimer

This project is for **portfolio and educational** use. It is **not** a legal opinion or a guarantee of GDPR compliance. Implementing it in a real organisation requires:

- **Legal and data-protection advice** (e.g. from a Datenschutzbeauftragter in Germany).
- **Privacy notices**, **consent** where needed, and **contracts** (e.g. AV-Vertrag with processors).
- **Operational policies** (retention, deletion, breach response, DPA with hosting/provider).
- **Insurance and sector-specific rules** (e.g. Pflege, SGB XI).

By using or showcasing this project, you acknowledge that compliance remains the responsibility of the data controller and their advisors.
