/**
 * Who is using the app. This is separate from the passenger type (Regular, Student, Senior, PWD):
 * the role changes the screens, the passenger type changes the fare.
 */
export type AppRole = 'commuter' | 'driver';

export const ROLE_LABELS: Record<AppRole, string> = {
  commuter: 'Commuter',
  driver: 'Tricycle driver',
};

/** The local profile. There is no server account: everything stays on this phone. */
export interface Profile {
  role: AppRole;
  displayName: string;
}
