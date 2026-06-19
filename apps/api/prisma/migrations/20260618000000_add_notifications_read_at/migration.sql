-- Track when the user last opened the notifications inbox, so synthetic
-- (booking-derived) notifications can be counted as read/unread consistently.
ALTER TABLE "User" ADD COLUMN "notificationsReadAt" TIMESTAMP(3);
