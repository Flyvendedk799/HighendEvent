// Foundations
export { cx, focusRing, tabularNums, type ClassValue } from "./utils";

// Actions
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./button";

// Form primitives
export { Field, FieldGroup, Label, type FieldProps } from "./field";
export {
  Input,
  Textarea,
  Select,
  Checkbox,
  controlClasses,
  type InputProps,
  type TextareaProps,
  type SelectProps,
  type SelectOption,
  type CheckboxProps,
} from "./input";
export { FileDropzone, type FileDropzoneProps } from "./file-dropzone";

// Layout
export {
  Page,
  PageHeader,
  Section,
  Breadcrumbs,
  DetailLayout,
  type PageProps,
  type PageHeaderProps,
  type SectionProps,
  type BreadcrumbItem,
} from "./page";
export { AppShell, type AppShellProps, type NavItem, type NavGroup } from "./app-shell";

// Surfaces
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardContentProps,
} from "./card";

// Data display
export {
  Table,
  TableContainer,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  TableMessage,
  DataList,
  type TrProps,
  type ThProps,
  type TdProps,
} from "./table";
export { Badge, type BadgeProps, type BadgeTone } from "./badge";
export {
  Money,
  StatCard,
  StatusBadge,
  DateRange,
  formatMoneyMinor,
  statusLabel,
  statusTone,
  type MoneyProps,
  type StatCardProps,
} from "./commerce";

// Feedback
export {
  EmptyState,
  Skeleton,
  TableSkeleton,
  Banner,
  Spinner,
  type EmptyStateProps,
  type SkeletonProps,
  type BannerTone,
  type SpinnerProps,
} from "./feedback";
export { ToastProvider, useToast, type Toast, type ToastTone } from "./toast";

// Overlays and navigation
export {
  Modal,
  ModalClose,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type ModalProps,
  type ConfirmDialogProps,
} from "./overlays";

// Filtering and paging
export {
  FilterBar,
  SearchInput,
  Pagination,
  Switch,
  type PaginationProps,
  type SwitchProps,
} from "./filters";

// Availability calendar
export {
  Calendar,
  CalendarLegend,
  eachIsoDate,
  type CalendarProps,
  type DayState,
  type DateRangeValue,
} from "./calendar";
