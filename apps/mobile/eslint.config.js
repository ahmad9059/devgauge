import expo from "eslint-config-expo/flat.js";

export default [
  {
    ignores: ["dist/**", ".expo/**", "node_modules/**", "expo-env.d.ts"],
  },
  ...expo,
];