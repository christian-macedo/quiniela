/**
 * WebAuthn / Passkey TypeScript Type Definitions
 */

export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid';

export type CredentialDeviceType = 'singleDevice' | 'multiDevice';

/**
 * WebAuthn Credential stored in database
 */
export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string; // Base64 encoded public key
  counter: number;
  device_type: CredentialDeviceType | null;
  backed_up: boolean;
  transports: AuthenticatorTransport[];
  aaguid: string | null;
  credential_name: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Challenge stored temporarily during registration/authentication
 */
export interface WebAuthnChallenge {
  id: string;
  user_id: string | null;
  challenge: string;
  type: 'registration' | 'authentication';
  created_at: string;
  expires_at: string;
}

/**
 * Relying Party (RP) Configuration
 */
export interface RPConfig {
  name: string;
  id: string;
  origin: string;
}

/**
 * Database insert types (omit auto-generated fields)
 */
export type WebAuthnCredentialInsert = Omit<
  WebAuthnCredential,
  'id' | 'created_at' | 'updated_at' | 'last_used_at'
> & {
  last_used_at?: string | null;
};

export type WebAuthnChallengeInsert = Omit<WebAuthnChallenge, 'id' | 'created_at'>;

/**
 * API Request/Response types
 */

export interface PasskeyRegisterOptionsRequest {
  // User must be authenticated - no body needed
}

// Note: These types use `any` because the actual JSON types from SimpleWebAuthn
// are complex and would require importing the entire package in the types file
export interface PasskeyRegisterVerifyRequest {
  response: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  credentialName?: string;
}

export interface PasskeyAuthenticateOptionsRequest {
  email: string;
}

export interface PasskeyAuthenticateVerifyRequest {
  response: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  email: string;
}

export interface PasskeyCredentialSummary {
  id: string;
  credentialId: string;
  credentialName: string | null;
  deviceType: CredentialDeviceType | null;
  lastUsedAt: string | null;
  createdAt: string;
  transports?: AuthenticatorTransport[];
  backedUp?: boolean;
}

export interface PasskeyListResponse {
  passkeys: PasskeyCredentialSummary[];
}

export interface PasskeyRenameRequest {
  name: string;
}

export interface PasskeyRenameResponse {
  success: boolean;
  passkey?: WebAuthnCredential;
}

export interface PasskeyDeleteResponse {
  success: boolean;
  message: string;
}
