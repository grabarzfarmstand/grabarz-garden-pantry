export const FARMSTAND_ANNOUNCEMENT_ID = "farmstand_announcement";
export const FARMSTAND_ANNOUNCEMENT_MAX_LENGTH = 500;
export const DEFAULT_FARMSTAND_ANNOUNCEMENT =
  "We’re currently between seasons in the garden and the chickens are molting—fresh eggs coming soon! In the meantime, small-batch soaps and pantry goods are ready to ship or schedule for pickup.";

export type FarmstandAnnouncement = {
  enabled: boolean;
  message: string;
};
