import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "src/components/ui/**",
      "src/**/__tests__/**",
      "src/**/test/**",
      "src/**/tests/**",
      "src/**/*.test.{js,jsx,ts,tsx}",
      "src/**/*.spec.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: "Use shadcn Input from src/components/ui/input.tsx.",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Use shadcn Select from src/components/ui/select.tsx.",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message: "Use shadcn Textarea from src/components/ui/textarea.tsx.",
        },
        {
          selector: "JSXOpeningElement[name.name='label']",
          message: "Use shadcn Label from src/components/ui/label.tsx.",
        },
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: "Use shadcn Button from src/components/ui/button.tsx.",
        },
        {
          selector: "JSXOpeningElement[name.name='table']",
          message: "Use shadcn Table from src/components/ui/table.tsx.",
        },
        {
          selector: "JSXAttribute[name.name='type'][value.value='date']",
          message: "Use the project DatePicker built from shadcn Calendar and Popover in src/components/ui/.",
        },
        {
          selector: "JSXAttribute[name.name='type'][value.value='datetime-local']",
          message: "Use the project DateTimePicker built from shadcn Calendar, Popover, and TimePicker compositions in src/components/ui/.",
        },
        {
          selector: "JSXAttribute[name.name='type'][value.value='time']",
          message: "Use the project TimePicker built from shadcn components in src/components/ui/; display es-AR 24-hour time.",
        },
        {
          selector: "JSXAttribute[name.name='role'][value.value='dialog']",
          message: "Use shadcn Dialog or AlertDialog from src/components/ui/dialog.tsx.",
        },
        {
          selector: "JSXAttribute[name.name='role'][value.value='tab']",
          message: "Use shadcn TabsTrigger from src/components/ui/tabs.tsx.",
        },
        {
          selector: "JSXAttribute[name.name='role'][value.value='tablist']",
          message: "Use shadcn TabsList from src/components/ui/tabs.tsx.",
        },
        {
          selector: "JSXAttribute[name.name='role'][value.value='menu']",
          message: "Use shadcn DropdownMenu or ContextMenu from src/components/ui/.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/animate-spin/]",
          message: "Use shadcn Spinner from src/components/ui/ for loading feedback.",
        },
        {
          selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/animate-spin/]",
          message: "Use shadcn Spinner from src/components/ui/ for loading feedback.",
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }],
    },
  },
  { ignores: ["public/mockServiceWorker.js", ".agents/**", ".claude/**", ".codex*/**", ".codex/**", ".orca/**"] },
];

export default eslintConfig;
