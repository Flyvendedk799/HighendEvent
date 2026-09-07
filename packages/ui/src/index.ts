// Foundations
export {
  cx,
  focusRing,
  hairlineGrid,
  monoLabel,
  panel,
  rowHeights,
  tabularNums,
  type ClassValue,
} from "./utils";

// Actions
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./button";

// Form primitives
export { Field, FieldGroup, Label, type FieldProps } from "./field";
export {
  Input,
  Textarea,
  Select,
  Checkbox,
  QuantityStepper,
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
export {
  AppShell,
  ShellBrand,
  ShellStatus,
  type AppShellProps,
  type NavItem,
  type NavGroup,
} from "./app-shell";

// Surfaces
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Panel,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardContentProps,
  type PanelProps,
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
export { Badge, LiveDot, type BadgeProps, type BadgeTone } from "./badge";
export {
  Money,
  StatCard,
  StatStrip,
  StatusBadge,
  StatusText,
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
  Meter,
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
  ScopeSwitch,
  Switch,
  type PaginationProps,
  type SwitchProps,
} from "./filters";

// Availability calendar and the occupancy board it shares with the console
export {
  Calendar,
  CalendarLegend,
  OccupancyBoard,
  BoardLegend,
  countBars,
  eachIsoDate,
  type CalendarProps,
  type DayState,
  type DateRangeValue,
  type BoardBar,
  type BoardRow,
  type BoardTone,
  type OccupancyBoardProps,
} from "./calendar";
