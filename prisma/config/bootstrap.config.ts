function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is missing.`);
  }

  return value;
}

export const bootstrapConfig = {
  superAdmin: {
    email: required('BOOTSTRAP_SUPER_ADMIN_EMAIL'),
    username: required('BOOTSTRAP_SUPER_ADMIN_USERNAME'),
    password: required('BOOTSTRAP_SUPER_ADMIN_PASSWORD'),
    displayName: required('BOOTSTRAP_SUPER_ADMIN_DISPLAY_NAME'),
    isVerified: true,
  },
};