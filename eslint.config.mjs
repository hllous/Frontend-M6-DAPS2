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
      ],
    },
  },
  // Shrinks to zero under #528; tables are owned by #520 and skeletons by #525; adding a file needs PO approval.
  {
    files: [
      "src/components/auth/login-form.tsx",
      "src/components/catalog/audited-tree-survey-panel.tsx",
      "src/components/catalog/catalog-deactivation-dialog.tsx",
      "src/components/catalog/confirm-relocation-dialog.tsx",
      "src/components/catalog/container-catalog-panel.tsx",
      "src/components/catalog/container-evidence-queue.tsx",
      "src/components/catalog/crew-catalog-panel.tsx",
      "src/components/catalog/disposal-sites-panel.tsx",
      "src/components/catalog/green-point-catalog-panel.tsx",
      "src/components/catalog/green-spaces-panel.tsx",
      "src/components/catalog/report-damage-dialog.tsx",
      "src/components/catalog/route-catalog-panel.tsx",
      "src/components/catalog/service-frequencies-panel.tsx",
      "src/components/catalog/service-types-panel.tsx",
      "src/components/catalog/tree-catalog-panel.tsx",
      "src/components/catalog/tree-interventions-panel.tsx",
      "src/components/catalog/vehicle-catalog-panel.tsx",
      "src/components/catalog/zone-catalog-panel.tsx",
      "src/components/environmental-reports/environmental-reports-workspace.tsx",
      "src/components/environmental-reports/report-decision-dialog.tsx",
      "src/components/indicators/indicators-dashboard.tsx",
      "src/components/map/mapa-operativo.tsx",
      "src/components/referrals/referrals-workspace.tsx",
      "src/components/services/assign-crew-dialog.tsx",
      "src/components/services/cancel-service-dialog.tsx",
      "src/components/services/confirm-reschedule-dialog.tsx",
      "src/components/services/create-repair-request-dialog.tsx",
      "src/components/services/create-street-closure-request-dialog.tsx",
      "src/components/services/inspection-execution-panel.tsx",
      "src/components/services/map-view.tsx",
      "src/components/services/reschedule-reason-dialog.tsx",
      "src/components/services/schedule-service-dialog.tsx",
      "src/components/services/service-detail.tsx",
      "src/components/services/services-table.tsx",
      "src/components/services/services-workspace.tsx",
      "src/components/services/suspend-service-dialog.tsx",
      "src/components/services/zone-execution-panel.tsx",
      "src/components/shell/shell-states.tsx",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
  { ignores: ["public/mockServiceWorker.js", ".codex*/**", ".codex/**"] },
];

export default eslintConfig;
