import { expect, it } from "vitest";

import { installMethod } from "./install";

const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const iphoneChrome = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1";
const ipadDesktopMode = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const android = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

it("shows Add to Home Screen steps in Safari on iPhone and iPad", () => {
  expect(installMethod({ userAgent: iphoneSafari, maxTouchPoints: 5, standalone: false, hasInstallEvent: false })).toBe("ios");
  expect(installMethod({ userAgent: ipadDesktopMode, maxTouchPoints: 5, standalone: false, hasInstallEvent: false })).toBe("ios");
});

it("uses the browser's own install prompt where there is one", () => {
  expect(installMethod({ userAgent: android, maxTouchPoints: 5, standalone: false, hasInstallEvent: true })).toBe("prompt");
});

it("offers nothing once installed, on a Mac, or in iOS browsers that cannot install", () => {
  expect(installMethod({ userAgent: iphoneSafari, maxTouchPoints: 5, standalone: true, hasInstallEvent: false })).toBeNull();
  expect(installMethod({ userAgent: ipadDesktopMode, maxTouchPoints: 0, standalone: false, hasInstallEvent: false })).toBeNull();
  expect(installMethod({ userAgent: android, maxTouchPoints: 5, standalone: false, hasInstallEvent: false })).toBeNull();
});

it("shows the same steps in other iOS browsers, which can add to the home screen since iOS 16.4", () => {
  expect(installMethod({ userAgent: iphoneChrome, maxTouchPoints: 5, standalone: false, hasInstallEvent: false })).toBe("ios");
});
