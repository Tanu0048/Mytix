export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      "no-console": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-restricted-syntax": [
        "error",
        {
          "selector": "MemberExpression[property.name='$queryRaw']",
          "message": "Raw SQL queries ($queryRaw) are strictly prohibited. Use Prisma ORM methods."
        },
        {
          "selector": "MemberExpression[property.name='$executeRaw']",
          "message": "Raw SQL execution ($executeRaw) is strictly prohibited. Use Prisma ORM methods."
        }
      ]
    }
  }
];
