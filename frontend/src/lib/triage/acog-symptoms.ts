import {
  AlertTriangle,
  Eye,
  Hand,
  HeartPulse,
  Wind,
  Activity,
  Baby,
  Droplet,
  type LucideIcon,
} from "lucide-react";

export interface AcogSymptom {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** ACOG red flag — drives escalation in the simulated pipeline. */
  redFlag: boolean;
}

export const ACOG_SYMPTOMS: AcogSymptom[] = [
  {
    id: "severe_headache",
    label: "Severe headache",
    description: "A bad headache that won't go away",
    icon: AlertTriangle,
    redFlag: true,
  },
  {
    id: "visual_changes",
    label: "Seeing spots or flashes",
    description: "Blurry vision or flashing lights",
    icon: Eye,
    redFlag: true,
  },
  {
    id: "swelling",
    label: "Swollen face or hands",
    description: "Sudden swelling, especially in your face",
    icon: Hand,
    redFlag: true,
  },
  {
    id: "chest_pain",
    label: "Chest pain",
    description: "Pain or pressure in your chest",
    icon: HeartPulse,
    redFlag: true,
  },
  {
    id: "shortness_breath",
    label: "Shortness of breath",
    description: "Trouble catching your breath",
    icon: Wind,
    redFlag: true,
  },
  {
    id: "abdominal_pain",
    label: "Severe abdominal pain",
    description: "Strong pain in your belly",
    icon: Activity,
    redFlag: true,
  },
  {
    id: "decreased_movement",
    label: "Decreased fetal movement",
    description: "Baby is moving less than usual",
    icon: Baby,
    redFlag: true,
  },
  {
    id: "bleeding",
    label: "Vaginal bleeding",
    description: "Any bleeding from the vagina",
    icon: Droplet,
    redFlag: true,
  },
];
