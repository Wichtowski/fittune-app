import { ApiClient } from "./client";

/** FitHealth nutrition endpoints under `/api/v1/health`, methods arrive with the food diary (#28) */
class FitHealthClient extends ApiClient {
  constructor() {
    super("/health");
  }
}

export const fithealth = new FitHealthClient();
