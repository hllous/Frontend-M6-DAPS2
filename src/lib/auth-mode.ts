type AuthModeEnvironment = {
  M6_AUTH_MODE?: string;
  NODE_ENV?: string;
};

export function isProductionAuthModeMisconfigured(environment: AuthModeEnvironment = process.env): boolean {
  return environment.NODE_ENV === "production" &&
    environment.M6_AUTH_MODE !== undefined &&
    environment.M6_AUTH_MODE !== "real-m1";
}
