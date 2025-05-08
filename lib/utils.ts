import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from "uuid"
import type { DemographicField } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Survey constants
export const questionTypeOptions = [
  { value: "likert", label: "Skala Likert (1-6)" },
  { value: "text", label: "Teks Masukan" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Tombol Radio" },
  { value: "checkbox", label: "Kotak Centang" },
  { value: "date", label: "Pemilih Tanggal" },
  { value: "number", label: "Angka Masukan" },
]

export const defaultDemographicFields: DemographicField[] = [
  { id: uuidv4(), label: "Nama", type: "text", required: true },
  {
    id: uuidv4(),
    label: "Tingkat Pendidikan",
    type: "dropdown",
    required: true,
    options: ["SMA/SMK", "Diploma", "Sarjana", "Magister", "Doktor", "Lainnya"],
  },
  { id: uuidv4(), label: "Tanggal Lahir", type: "date", required: true },
  {
    id: uuidv4(),
    label: "Jenis Kelamin",
    type: "radio",
    required: true,
    options: ["Laki-laki", "Perempuan", "Lainnya", "Memilih untuk tidak mengatakan"],
  },
  {
    id: uuidv4(),
    label: "Pekerjaan",
    type: "dropdown",
    required: true,
    options: ["Pelajar/Mahasiswa", "Pegawai", "Wiraswasta", "Tidak Bekerja", "Pensiunan"],
  },
  { id: uuidv4(), label: "Nomor Telepon", type: "number", required: true },
  {
    id: uuidv4(),
    label: "Layanan yang Diterima",
    type: "dropdown",
    required: true,
    options: ["Layanan Pelanggan", "Dukungan Teknis", "Pertanyaan Penjualan", "Demo Produk", "Lainnya"],
  },
]
