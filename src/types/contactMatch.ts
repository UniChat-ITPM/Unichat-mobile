export interface ContactMatchDto {
  phoneNumber: string;
  userId: string;
  displayName: string;
  username?: string | null;
  profilePhoto?: string | null;
}

export interface MatchContactsRequest {
  phoneNumbers: string[];
  excludeSelf?: boolean;
}

export interface MatchContactsResponse {
  matches: ContactMatchDto[];
}
