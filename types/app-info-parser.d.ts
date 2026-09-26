declare module "app-info-parser/src/apk" {
  export type ApkInfo = {
    package?: string;
    versionName?: string;
    versionCode?: string | number;
    usesSdk?: { minSdkVersion?: string; targetSdkVersion?: string } | null;
    application?: { label?: string; icon?: string } & Record<string, unknown>;
    icon?: string | null;
    [key: string]: unknown;
  };

  export default class ApkParser {
    constructor(file: File | Blob);
    parse(): Promise<ApkInfo>;
  }
}
