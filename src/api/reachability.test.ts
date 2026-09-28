import { onlineManager } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { reportNoResponse, reportResponse, useApiReachable } from "./reachability";

afterEach(() => {
  onlineManager.setOnline(true);
  reportResponse(200);
});

describe("API reachability", () => {
  it("treats gateway errors and missing responses while online as the servers being down", () => {
    const { result } = renderHook(() => useApiReachable());
    act(() => reportResponse(503));
    expect(result.current).toBe(false);
    act(() => reportResponse(422));
    expect(result.current).toBe(true);
    act(() => reportNoResponse());
    expect(result.current).toBe(false);
  });

  it("does not blame the servers when the device is offline", () => {
    const { result } = renderHook(() => useApiReachable());
    onlineManager.setOnline(false);
    act(() => reportNoResponse());
    expect(result.current).toBe(true);
  });
});
