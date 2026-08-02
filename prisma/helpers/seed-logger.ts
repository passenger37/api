export class SeedLogger {
  static title(message: string) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🌱 ${message}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  static success(message: string) {
    console.log(`✅ ${message}`);
  }

  static info(message: string) {
    console.log(`ℹ️  ${message}`);
  }

  static warn(message: string) {
    console.log(`⚠️  ${message}`);
  }

  static error(message: string) {
    console.error(`❌ ${message}`);
  }
}