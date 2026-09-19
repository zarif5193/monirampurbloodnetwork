import { ageFromDob } from "@/lib/eligibility";
import type { DonorProfileRow } from "@/db/schema";

/** The only donor fields that may ever leave the server for public discovery. */
export type PublicDonor = {
  id: string;
  displayName: string;
  bloodGroup: string;
  unionName: string;
  upazila: string;
  district: string;
  availabilityStatus: string;
  verificationStatus: string;
  age: number;
  donationCount: number;
  lastDonationDate: string | null;
  nextPotentialDonationDate: string | null;
  preliminaryEligibility: "POSSIBLE" | "NOT_POSSIBLE" | "UNKNOWN";
};

type Bool = boolean | null;

/**
 * Strict projection: phone number, email, date of birth, weight, height,
 * area details and private health notes are never included.
 */
export function toPublicDonor(
  profile: DonorProfileRow,
  flags: { eligible: Bool },
): PublicDonor {
  return {
    id: profile.id,
    displayName: profile.displayName,
    bloodGroup: profile.bloodGroup,
    unionName: profile.unionName,
    upazila: profile.upazila,
    district: profile.district,
    availabilityStatus: profile.availabilityStatus,
    verificationStatus: profile.verificationStatus,
    age: ageFromDob(profile.dateOfBirth),
    donationCount: profile.donationCount,
    lastDonationDate: profile.lastDonationDate ?? null,
    nextPotentialDonationDate: profile.nextPotentialDonationDate ?? null,
    preliminaryEligibility:
      flags.eligible === null ? "UNKNOWN" : flags.eligible ? "POSSIBLE" : "NOT_POSSIBLE",
  };
}

/** Determines whether a donor profile is publicly discoverable. */
export function isSearchableProfile(profile: DonorProfileRow): boolean {
  return (
    profile.searchable &&
    profile.profileComplete &&
    profile.availabilityStatus === "AVAILABLE"
  );
}
