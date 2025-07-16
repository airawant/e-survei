"use client"

/**
 * SurveyFormComponent
 *
 * Keterangan penting:
 * - Komponen ini mendukung penambahan indikator dan pertanyaan tanpa batasan jumlah
 * - Menggunakan useFieldArray untuk indikator dan pertanyaan sesuai dengan aturan React Hooks
 * - Pendekatan ini menghindari pelanggaran Rules of Hooks dengan tidak memanggil hooks di dalam useMemo atau loops
 * - Fitur penambahan pertanyaan tanpa batas menggunakan manipulasi array manual dan update state
 */

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Info, Plus, Save, Trash2, User } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { v4 as uuidv4 } from "uuid"
import { cn } from "@/lib/utils"
import Layout from "@/components/Layout"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import type { Survey, DemographicField, Question } from "@/types"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createSurvey as createSupabaseSurvey, updateSurvey as updateSupabaseSurvey, addIndicator, addQuestion, addDemographicField } from '@/lib/supabase'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const questionTypeOptions = [
  { value: "likert-4", label: "Skala Likert (1-4)" },
  { value: "likert-6", label: "Skala Likert (1-6)" },
  { value: "text", label: "Teks Masukan" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Tombol Radio" },
  { value: "checkbox", label: "Kotak Centang" },
  { value: "date", label: "Pemilih Tanggal" },
  { value: "number", label: "Angka Masukan" },
]

interface SurveyFormComponentProps {
  router: AppRouterInstance
  isEditing: boolean
  id?: string
}

// Interface untuk indikator dalam FormValues
interface FormValuesIndicator {
  id?: string;
  title: string;
  description?: string;
  weight?: number; // Bisa undefined karena tidak selalu disediakan oleh form
  questions: {
    id?: string;
    text: string;
    type: string;
    required: boolean;
    weight?: number; // Bisa undefined dari form
    options?: string[];
  }[];
}

const SurveyFormComponent = ({ router, isEditing, id }: SurveyFormComponentProps) => {
  const { surveys, createSurvey, updateSurvey, getSurvey, currentSurvey } = useSurvey()
  const [activeTab, setActiveTab] = useState("details")
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [expandedIndicators, setExpandedIndicators] = useState<Record<number, boolean>>({})
  const searchParams = useSearchParams()

  // Baca tipe survei dari URL parameter (untuk pembuatan baru) dan dari data survei (untuk edit)
  const urlSurveyType = searchParams.get('type') || 'weighted'
  const [isWeightedSurvey, setIsWeightedSurvey] = useState(urlSurveyType === 'weighted')

  const supabase = createClientComponentClient()

  const updateFormSchema = useCallback(() => {
    const newFormSchema = z
      .object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        isActive: z.boolean().default(false),
        surveyCategory: z.enum(["calculate", "non_calculate"]).default("calculate"),
        indicators: z
          .array(
            z.object({
              id: z.string().optional(),
              title: z.string().min(1, "Indicator title is required"),
              description: z.string().optional(),
              questions: z
                .array(
                  z.object({
                    id: z.string().optional(),
                    text: z.string().min(1, "Question text is required"),
                    type: z.string(),
                    required: z.boolean().default(true),
                    options: z.array(z.string()).optional(),
                    weight: isWeightedSurvey
                      ? z.number().min(1, "Weight must be at least 1").max(100, "Weight cannot exceed 100")
                      : z.number().default(1),
                  }),
                )
                .min(1, "At least one question is required"),
            }),
          )
          .min(1, "At least one indicator is required"),
        demographicFields: z.array(
          z.object({
            id: z.string().optional(),
            label: z.string().min(1, "Field label is required"),
            type: z.string(),
            required: z.boolean().default(true),
            options: z.array(z.string()).optional(),
          }),
        ),
        period: z.object({
          type: z.string().min(1, "Period type is required"),
          quarter: z.string().optional(),
          semester: z.string().optional(),
          year: z.number().min(2000, "Valid year is required"),
        }).refine(data => {
          // Jika tipe quarterly, pastikan quarter terisi
          if (data.type === 'quarterly' && !data.quarter) {
            return false;
          }
          // Jika tipe semester, pastikan semester terisi
          if (data.type === 'semester' && !data.semester) {
            return false;
          }
          return true;
        }, {
          message: "Harus memilih period quarter atau semester sesuai tipe yang dipilih",
          path: ["type"]
        }),
      });

    return newFormSchema;
  }, [isWeightedSurvey]);

  const formSchema = updateFormSchema()

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      isActive: false,
      surveyCategory: "calculate",
      indicators: [
        {
          id: uuidv4(),
          title: "Service Quality",
          description: "Measures the quality of service provided",
          questions: [
            {
              id: uuidv4(),
              text: "How would you rate the overall quality of our service?",
              type: "likert",
              required: true,
              weight: isWeightedSurvey ? 30 : 1,
            },
          ],
        },
      ],
      demographicFields: [],
      period: {
        type: "quarterly",
        quarter: "1",
        semester: undefined,
        year: new Date().getFullYear(),
      },
    },
  })

  // Update resolver ketika isWeightedSurvey berubah
  useEffect(() => {
    // Buat form baru dengan schema yang diperbarui
    const updatedSchema = updateFormSchema();

    // Dapatkan nilai saat ini
    const currentValues = form.getValues();

    console.log("Memperbarui form schema berdasarkan isWeightedSurvey:", isWeightedSurvey);
    console.log("Nilai form saat ini:", currentValues);

    // Re-create form dengan resolver baru
    form.reset(currentValues, {
      keepValues: true,
      keepDirty: true,
      keepErrors: false,
      keepIsSubmitted: false,
      keepTouched: false,
      keepIsValid: false,
      keepSubmitCount: false,
    });

    // Hapus error yang ada
    form.clearErrors();
  }, [form, isWeightedSurvey, updateFormSchema]);

  // Perbarui surveyCategory jika jenis survei berubah
  useEffect(() => {
    if (isWeightedSurvey) {
      form.setValue('surveyCategory', 'calculate');
    }
  }, [isWeightedSurvey, form]);

  // Field array untuk indikator
  const {
    fields: indicatorFields,
    append: appendIndicator,
    remove: removeIndicator,
    move: moveIndicator,
  } = useFieldArray({
    name: "indicators",
    control: form.control,
  })

  // Field array untuk pertanyaan pada semua indikator
  // Buat hook terpisah tingkat atas - tidak di dalam map atau useMemo
  // Pendekatan ini mematuhi Rules of Hooks karena hook dipanggil di level tertinggi komponen
  const questionsFieldArray = useFieldArray({
    name: "indicators",
    control: form.control,
  });

  // Field array untuk demographic fields
  const {
    fields: demographicFields,
    append: appendDemographic,
    remove: removeDemographic,
  } = useFieldArray({
    name: "demographicFields",
    control: form.control,
  })

  useEffect(() => {
    if (isEditing && id) {
      console.log("Edit mode detected - Survey ID:", id);
      setFormSubmitting(true);

      const fetchSurveyData = async () => {
        try {
          // Menggunakan currentSurvey sebagai cache jika sudah ada dan ID nya sama
          if (currentSurvey && currentSurvey.id === id) {
            console.log("Using cached survey data:", currentSurvey.id);
            return currentSurvey;
          }

          // Jika tidak ada cache, ambil dari database
          console.log("Fetching survey data from database for ID:", id);
          const loadedSurvey = await getSurvey(id);
          return loadedSurvey;
        } catch (error) {
          console.error("Error fetching survey data:", error);
          toast.error("Gagal mengambil data survei");
          return null;
        }
      };

      fetchSurveyData()
        .then((loadedSurvey: any) => {
          if (loadedSurvey !== undefined && loadedSurvey !== null) {
            console.log("Survey loaded successfully:", loadedSurvey?.id);
            console.log("Survey details:", {
              title: loadedSurvey?.title,
              description: loadedSurvey?.description,
              isActive: loadedSurvey.isActive,
              indicators: loadedSurvey.indicators?.length || 0,
              demographicFields: loadedSurvey.demographicFields?.length || 0
            });

            // Update isWeightedSurvey berdasarkan tipe survei yang dimuat
            if (loadedSurvey.type) {
              console.log("Survey type from database:", loadedSurvey.type);
              setIsWeightedSurvey(loadedSurvey.type === 'weighted');
            }

            // Dump indicators structure for debugging
            if (loadedSurvey.indicators) {
              loadedSurvey.indicators.forEach((indicator: any, idx: number) => {
                console.log(`Indicator ${idx+1}:`, {
                  id: indicator.id,
                  title: indicator.title || indicator.name,
                  questionCount: indicator.questions?.length || 0
                });
                if (indicator.questions && indicator.questions.length > 0) {
                  indicator.questions.forEach((q: any, qIdx: number) => {
                    console.log(`  Question ${qIdx+1}:`, {
                      id: q.id,
                      text: q.text,
                      weight: q.weight
                    });
                  });
                }
              });
            }

            // Tambahkan log khusus untuk field demografis
            if (loadedSurvey.demographicFields && loadedSurvey.demographicFields.length > 0) {
              console.log("Demographic fields loaded:", loadedSurvey.demographicFields.length);
              loadedSurvey.demographicFields.forEach((field: any, idx: number) => {
                console.log(`Demographic field ${idx+1}:`, {
                  id: field.id,
                  label: field.label,
                  type: field.type,
                  required: field.required,
                  options: field.options
                });
              });
            } else {
              console.log("No demographic fields loaded from getSurvey, will fetch directly from database");
            }
          }
        })
        .catch(err => {
          console.error("Error in survey data promise chain:", err);
          toast.error("Terjadi kesalahan saat memproses data survei");
        })
        .finally(() => setFormSubmitting(false));
    }
  }, [isEditing, id, getSurvey, currentSurvey])

  // Tambahkan useEffect khusus untuk mengambil field demografis
  useEffect(() => {
    // Hanya jalankan dalam mode edit dan jika id tersedia
    if (isEditing && id) {
      const fetchDemographicFields = async () => {
        try {
          console.log("Fetching demographic fields directly from database for survey:", id);

          // Ambil data demografis langsung dari tabel demographic_fields
          const { data: demografiFields, error } = await supabase
            .from('demographic_fields')
            .select('*')
            .eq('survey_id', id)
            .order('field_order', { ascending: true });

          if (error) {
            console.error("Error fetching demographic fields from database:", error);
            return;
          }

          console.log(`Retrieved ${demografiFields?.length || 0} demographic fields from database`);

          if (demografiFields && demografiFields.length > 0) {
            // Log rincian field demografis yang ditemukan
            demografiFields.forEach((field, idx) => {
              console.log(`Database demographic field ${idx+1}:`, {
                id: field.id,
                label: field.label,
                type: field.type,
                required: field.required,
                options: field.options
              });
            });

            // Format options dari JSON jika perlu
            const formattedDemographicFields = demografiFields.map(field => {
              let parsedOptions = [];
              if (field.options) {
                try {
                  parsedOptions = typeof field.options === 'string'
                    ? JSON.parse(field.options)
                    : (Array.isArray(field.options) ? field.options : []);
                } catch (e) {
                  console.error(`Error parsing options for field ${field.id}:`, e);
                  parsedOptions = [];
                }
              }

              return {
                id: field.id,
                label: field.label,
                type: field.type,
                required: field.required !== undefined ? field.required : true,
                options: parsedOptions
              };
            });

            // Update form values dengan field demografis yang diperoleh dari database
            form.setValue('demographicFields', formattedDemographicFields);
            console.log("Form demographic fields updated with database values");
          } else {
            console.log("No demographic fields found in database for this survey");

            // Solusi cadangan: gunakan data dari currentSurvey jika tersedia
            if (currentSurvey?.demographicFields && currentSurvey.demographicFields.length > 0) {
              console.log("Using demographic fields from currentSurvey as fallback");
              const fallbackFields = currentSurvey.demographicFields.map(field => ({
                id: field.id || uuidv4(),
                label: field.label || '',
                type: field.type || 'text',
                required: field.required !== undefined ? field.required : true,
                options: Array.isArray(field.options) ? field.options : []
              }));

              form.setValue('demographicFields', fallbackFields);
              console.log("Form demographic fields updated with fallback values, count:", fallbackFields.length);
            }
          }
        } catch (fetchError) {
          console.error("Error in fetchDemographicFields:", fetchError);
        }
      };

      fetchDemographicFields();
    }
  }, [isEditing, id, supabase, form, currentSurvey]);

  useEffect(() => {
    if (isEditing && currentSurvey) {
      console.log("Loading survey data for edit mode:", currentSurvey);

      // Tambahkan log untuk melihat nilai demografis saat ini di form
      const currentDemographicFields = form.getValues('demographicFields');
      console.log("Current demographic fields in form before reset:", currentDemographicFields);
      console.log("Number of demographic fields in form:", currentDemographicFields?.length || 0);

      try {
        // Konversi indicators dari format database ke format form
        const formattedIndicators = Array.isArray(currentSurvey.indicators)
          ? currentSurvey.indicators.map(indicator => {
              // Gunakan id yang ada atau buat baru
              const indicatorId = indicator.id || uuidv4();

              // Pastikan questions di-map dengan benar
              const formattedQuestions = Array.isArray(indicator.questions)
                ? indicator.questions.map(question => ({
                    id: question.id || uuidv4(),
                    text: question.text || '',
                    type: question.type || 'likert',
                    required: question.required !== undefined ? question.required : true,
                    options: Array.isArray(question.options) ? question.options : [],
                    weight: typeof question.weight === 'number' ? question.weight : 1
                  }))
                : [];

              return {
                id: indicatorId,
                title: indicator.title || '',
                description: indicator.description || '',
                weight: typeof indicator.weight === 'number' ? indicator.weight : 1,
                questions: formattedQuestions.length > 0 ? formattedQuestions : [{
                  id: uuidv4(),
                  text: "How would you rate this service?",
                  type: "likert",
                  required: true,
                  weight: 1
                }]
              };
            })
          : [];

        // Format periode jika ada, atau berikan default
        const period = currentSurvey.period || { type: "quarterly", quarter: "1", year: new Date().getFullYear() };
        // Pastikan type periode valid
        if (!period.type || (period.type !== 'quarterly' && period.type !== 'semester' && period.type !== 'annual')) {
          period.type = 'quarterly';
        }
        // Pastikan quarter/semester ada jika tipe periode sesuai dan konversi ke format numerik
        if (period.type === 'quarterly') {
          // Konversi dari Q1, Q2, dll menjadi 1, 2, dll
          period.quarter = period.quarter?.replace('Q', '') || '1';
        }
        if (period.type === 'semester') {
          // Konversi dari S1, S2 menjadi 1, 2
          period.semester = period.semester?.replace('S', '') || '1';
        }

        // Catatan: Kita tidak perlu mengisi demographicFields di sini karena
        // telah ditangani oleh useEffect sebelumnya yang mengambil langsung dari database

        // Siapkan data form lengkap
        const formData: FormValues = {
          title: currentSurvey.title || '',
          description: currentSurvey.description || '',
          isActive: currentSurvey.isActive !== undefined ? currentSurvey.isActive : false,
          surveyCategory: isWeightedSurvey ? 'calculate' : (currentSurvey.surveyCategory || 'calculate'),
          indicators: formattedIndicators.length > 0 ? formattedIndicators : [
            {
              id: uuidv4(),
              title: "Service Quality",
              description: "Measures the quality of service provided",
              questions: [
                {
                  id: uuidv4(),
                  text: "How would you rate the overall quality of our service?",
                  type: "likert",
                  required: true,
                  weight: isWeightedSurvey ? 30 : 1,
                }
              ]
            }
          ],
          // Jangan override demographicFields yang sudah diambil langsung dari database
          demographicFields: form.getValues('demographicFields') || [],
          period: period
        };

        console.log("Form data prepared for loading:", formData);

        // Set form data
        form.reset(formData);

        // Expand all indicators untuk mempermudah editing
        const newExpandedState: Record<number, boolean> = {};
        formattedIndicators.forEach((_, index) => {
          newExpandedState[index] = true;
        });
        setExpandedIndicators(newExpandedState);

        // Set tab aktif
        setActiveTab("details");
        console.log("Form loading complete");
      } catch (error) {
        console.error("Error processing survey data for form:", error);
        toast.error("Terjadi kesalahan saat memuat data survei");
      }
    }
  }, [isEditing, currentSurvey, form, isWeightedSurvey])

  const onSubmit = async (data: FormValues) => {
    try {
      setFormSubmitting(true)
      console.log("Form data submitted:", data);

      // Pastikan semua ID indikator dan pertanyaan tersedia
      if (data.indicators) {
        // Log untuk debugging
        console.log(`Processing ${data.indicators.length} indicators before submission`);

        // Pastikan setiap indikator memiliki ID dan setiap pertanyaan di dalamnya memiliki ID
        data.indicators.forEach((indicator, indIndex) => {
          // Validasi ID indikator
          if (!indicator.id || indicator.id === 'undefined') {
            console.warn(`Indikator #${indIndex + 1} (${indicator.title}) tidak memiliki ID valid, menggunakan UUID baru`);
            indicator.id = uuidv4();
          }

          // Pastikan semua pertanyaan memiliki ID
          if (indicator.questions && indicator.questions.length > 0) {
            console.log(`Indikator "${indicator.title}" memiliki ${indicator.questions.length} pertanyaan`);

            indicator.questions.forEach((question, qIndex) => {
              if (!question.id || question.id === 'undefined') {
                console.warn(`Pertanyaan #${qIndex + 1} pada indikator "${indicator.title}" tidak memiliki ID valid, menggunakan UUID baru`);
                question.id = uuidv4();
              }
            });
          } else {
            console.log(`Indikator "${indicator.title}" tidak memiliki pertanyaan`);
          }
        });
      }

      // Debug: Log indicators dengan ID mereka
      console.log("Indicators yang akan dikirim:", data.indicators.map(ind => ({
        id: ind.id,
        title: ind.title,
        questionCount: ind.questions?.length || 0
      })));

      // Log data yang akan disimpan
      console.log(`Will ${isEditing ? 'update' : 'create'} survey with: `, JSON.stringify(data, null, 2));

      if (isEditing && id) {
        console.log("Updating existing survey:", id);

        // Tambahkan debugging untuk melihat periode yang dikirim ke updateSurvey
        console.log("Mengirim data periode ke updateSurvey:", {
          type: data.period.type as "semester" | "quarterly" | "annual",
          year: data.period.year,
          quarter: data.period.type === 'quarterly' ? data.period.quarter : undefined,
          semester: data.period.type === 'semester' ? data.period.semester : undefined
        });

        try {
          // Persiapkan data update
          const surveyData = {
            title: data.title,
            description: data.description,
            isActive: data.isActive,
            type: isWeightedSurvey ? 'weighted' : 'unweighted',
            surveyCategory: isWeightedSurvey ? 'calculate' : data.surveyCategory,
            indicators: data.indicators.map(ind => {
              // Cast ke tipe known
              const indicator = ind as FormValuesIndicator;
              return {
                id: indicator.id || uuidv4(),
                title: indicator.title,
                description: indicator.description || '',
                weight: isWeightedSurvey ? (indicator.weight || 1) : 1,
                questions: indicator.questions.map(q => ({
                  id: q.id || uuidv4(),
                  text: q.text,
                  type: q.type,
                  required: q.required,
                  options: q.options || [],
                  weight: isWeightedSurvey ? (q.weight || 1) : 1,
                }))
              };
            }),
            // Tambahkan data periode
            period: {
              type: data.period.type as "semester" | "quarterly" | "annual",
              year: data.period.year,
              ...(data.period.type === 'quarterly' && { quarter: data.period.quarter }),
              ...(data.period.type === 'semester' && { semester: data.period.semester })
            }
          };

          console.log("Calling updateSurvey with ID:", id);
          console.log("Update data sample:", {
            title: surveyData.title,
            description: surveyData.description.substring(0, 50) + "...",
            indicatorCount: surveyData.indicators.length
          });

          // Panggil fungsi update
          await updateSurvey(id, surveyData);

          // Refresh survey data setelah update berhasil
          await getSurvey(id);

          // Update data demografis
          try {
            console.log("Updating demographic fields");

            // Catatan: Untuk updateSurvey, pendekatan yang lebih baik adalah:
            // 1. Mendapatkan field demografis yang sudah ada
            // 2. Menghapus field yang sudah tidak digunakan
            // 3. Memperbarui field yang sudah ada
            // 4. Menambahkan field baru

            // Namun untuk sederhananya, kita hapus semua field demografis yang ada dan buat ulang

            // Hapus semua field demografis yang ada untuk survei ini
            const { error: deleteError } = await supabase
              .from('demographic_fields')
              .delete()
              .eq('survey_id', id);

            if (deleteError) {
              console.error("Error deleting existing demographic fields:", deleteError);
              throw deleteError;
            }

            // Tambahkan field demografis baru
            const demographicPromises = data.demographicFields.map(async (field, index) => {
              try {
                console.log(`Adding demographic field ${index + 1}/${data.demographicFields.length}: ${field.label}`);

                const createdField = await addDemographicField({
                  survey_id: id,
                  label: field.label,
                  type: field.type,
                  required: field.required,
                  options: field.options || [],
                  field_order: index + 1
                });

                console.log(`Demographic field created with ID: ${createdField?.id}`);
                return createdField;
              } catch (demographicError) {
                console.error(`Error adding demographic field ${index + 1}:`, demographicError);
                return null;
              }
            });

            const successfulDemographics = await Promise.all(demographicPromises);
            console.log(`Successfully updated ${successfulDemographics.filter(Boolean).length}/${data.demographicFields.length} demographic fields`);
          } catch (demographicError) {
            console.error("Error updating demographic fields:", demographicError);
            // Tampilkan peringatan tapi jangan batalkan proses update survei
            toast.warning("Survei berhasil diperbarui tetapi terjadi masalah saat memperbarui data demografis");
          }

          toast.success("Survey updated successfully");
          router.push("/admin/manage");
        } catch (updateError) {
          console.error("Error updating survey:", updateError);
          toast.error("Failed to update survey");
        }
      } else {
        console.log("Creating new survey");
        try {
          // Format data untuk pembuatan survei
          const surveyData = {
            title: data.title,
            description: data.description,
            isActive: data.isActive || true,
            type: isWeightedSurvey ? 'weighted' : 'unweighted',
            surveyCategory: isWeightedSurvey ? 'calculate' : data.surveyCategory,
            indicators: data.indicators.map(ind => {
              // Cast ke tipe known
              const indicator = ind as FormValuesIndicator;
              return {
                id: indicator.id || uuidv4(),
                title: indicator.title,
                description: indicator.description || '',
                weight: isWeightedSurvey ? (indicator.weight || 1) : 1,
                questions: indicator.questions.map(q => ({
                  id: q.id || uuidv4(),
                  text: q.text,
                  type: q.type,
                  required: q.required,
                  options: q.options || [],
                  weight: isWeightedSurvey ? (q.weight || 1) : 1,
                }))
              };
            }),
            // Pastikan data periode disertakan dengan benar
            period: {
              type: data.period.type,
              year: data.period.year,
              ...(data.period.type === 'quarterly' && { quarter: data.period.quarter }),
              ...(data.period.type === 'semester' && { semester: data.period.semester })
            }
          };

          console.log("Prepared survey data:", surveyData);

          // Persiapkan data untuk Supabase
          const supabaseData = {
            title: surveyData.title,
            description: surveyData.description,
            type: isWeightedSurvey ? 'weighted' as 'weighted' : 'unweighted' as 'unweighted',
            survey_category: surveyData.surveyCategory,
            is_active: true,
            // Tambahkan data periode ke database dengan format yang benar
            period_type: data.period.type,
            period_year: data.period.year,
            // Tambahkan nilai period berdasarkan tipe periode (quarterly, semester atau annual)
            period: data.period.type === 'quarterly' ? `Q${data.period.quarter}` :
                   data.period.type === 'semester' ? `S${data.period.semester}` :
                   'TAHUN' // Default untuk tipe annual
          };

          console.log("Data periode yang akan disimpan:", {
            raw_period: data.period,
            period_type: supabaseData.period_type,
            period_year: supabaseData.period_year,
            period: supabaseData.period,
            formatted_display: data.period.type === 'quarterly'
              ? `Q${data.period.quarter}-${data.period.year}`
              : data.period.type === 'semester'
                ? `S${data.period.semester}-${data.period.year}`
                : `TAHUN-${data.period.year}`
          });

          try {
            // Buat survey di Supabase
            const supabaseSurvey = await createSupabaseSurvey(supabaseData);
            console.log("Supabase survey created:", supabaseSurvey);

            if (!supabaseSurvey || !supabaseSurvey.id) {
              throw new Error("Gagal membuat survei di database");
            }

          // Tambahkan indikator dan pertanyaan ke Supabase
            console.log("Adding indicators and questions");
            const indicatorPromises = surveyData.indicators.map(async (indicator, index) => {
              try {
                console.log(`Adding indicator ${index + 1}/${surveyData.indicators.length}: ${indicator.title}`);

                // Tambahkan indikator
                const createdIndicator = await addIndicator({
                  survey_id: supabaseSurvey.id,
                  title: indicator.title,
                  description: indicator.description || '',
                  weight: isWeightedSurvey ? (indicator.weight || 1) : 1
                });

                if (!createdIndicator || !createdIndicator.id) {
                  console.error(`Failed to create indicator: ${indicator.title}`);
                  throw new Error(`Gagal membuat indikator: ${indicator.title}`);
                }

                console.log(`Indicator created with ID: ${createdIndicator.id}`);

                // Tambahkan semua pertanyaan untuk indikator ini
                const questionPromises = indicator.questions.map(async (question, qIndex) => {
                  try {
                    console.log(`Adding question ${qIndex + 1}/${indicator.questions.length} to indicator ${createdIndicator.id}`);

                    // Validasi data pertanyaan
                    if (!createdIndicator.id) {
                      throw new Error(`Indicator ID is missing for question: ${question.text}`);
                    }

                    // Pastikan semua properti yang diperlukan tersedia
                    if (!question.text || question.text.trim() === '') {
                      console.warn(`Empty question text for question #${qIndex + 1}, using default text`);
                      question.text = `Question #${qIndex + 1}`;
                    }

                    // Validasi weight
                    let questionWeight = 1; // Default weight
                    if (typeof question.weight === 'number' && !isNaN(question.weight)) {
                      questionWeight = Math.max(1, Math.min(100, question.weight)); // Batasi antara 1-100
                    } else {
                      console.warn(`Invalid weight for question: ${question.text}, using default weight 1`);
                    }

                    // Validasi type dan required
                    const validType: string = question.type || "likert";
                    const isRequired: boolean = question.required !== undefined ? question.required : true;

                    // Validasi options dan konversi ke tipe string[] yang eksplisit
                    const validOptions: string[] = (() => {
                      if (question.options && Array.isArray(question.options)) {
                        return question.options
                          .filter((opt): opt is string => opt !== null && opt !== undefined)
                          .map(opt => String(opt).trim())
                          .filter(opt => opt !== '');
                      }
                      console.warn(`Options is not a valid array for question: ${question.text}, using empty array`);
                      return [];
                    })();

                    // Persiapkan objek question yang valid dengan tipe yang eksplisit
                    const validQuestion = {
                      indicator_id: createdIndicator.id,
                      text: question.text.trim(),
                      type: validType,
                      required: isRequired,
                      options: validOptions,
                      weight: questionWeight,
                      order: qIndex + 1
                    };

                    // Log parameter yang akan dikirim
                    console.log("Question parameters:", JSON.stringify(validQuestion, null, 2));

                    try {
                      // Panggil API dengan data yang sudah divalidasi
                      const createdQuestion = await addQuestion(validQuestion);

                      console.log(`Question created with ID: ${createdQuestion?.id || 'unknown'}`);
                      return createdQuestion;
                    } catch (addError) {
                      console.error(`Error in addQuestion call for question #${qIndex + 1}:`, addError);
                      console.error("Question data that failed:", JSON.stringify(validQuestion, null, 2));
                      throw addError;
                    }
                  } catch (questionError) {
                    console.error(`Error adding question ${qIndex + 1}:`, questionError);
                    console.error("Failed question data:", JSON.stringify(question, null, 2));

                    // Log error stack jika tersedia
                    if (questionError instanceof Error && questionError.stack) {
                      console.error("Error stack:", questionError.stack);
                    }

                    // Lanjutkan ke pertanyaan berikutnya meskipun ada error
                    return null;
                  }
                });

                // Tunggu semua pertanyaan selesai ditambahkan
                try {
                  const createdQuestions = await Promise.all(questionPromises);
                  const successCount = createdQuestions.filter(Boolean).length;
                  console.log(`Added ${successCount}/${indicator.questions.length} questions to indicator ${createdIndicator.id}`);

                  if (successCount === 0 && indicator.questions.length > 0) {
                    console.warn(`Warning: Failed to add any questions to indicator ${createdIndicator.id}`);
                  }

                  return {
                    indicator: createdIndicator,
                    questions: createdQuestions.filter(Boolean)
                  };
                } catch (promiseError) {
                  console.error(`Error waiting for questions to be added for indicator #${index + 1}:`, promiseError);
                  return {
                    indicator: createdIndicator,
                    questions: []
                  };
                }
              } catch (indicatorError) {
                console.error(`Error adding indicator ${index + 1}:`, indicatorError);
                return null;
              }
            });

            // Tunggu semua indikator dan pertanyaan selesai ditambahkan
            const results = await Promise.all(indicatorPromises);
            const successfulIndicators = results.filter(Boolean);

            console.log(`Successfully added ${successfulIndicators.length}/${surveyData.indicators.length} indicators with their questions`);

            // Jika tidak ada indikator yang berhasil ditambahkan, tampilkan peringatan
            if (successfulIndicators.length === 0 && surveyData.indicators.length > 0) {
              toast.warning("Survei dibuat tetapi gagal menyimpan indikator dan pertanyaan");
            } else {
              // Cek jika judul survei telah diubah (karena duplikasi)
              if (supabaseSurvey.title !== surveyData.title) {
                toast.success(`Survei berhasil dibuat dengan judul diubah menjadi "${supabaseSurvey.title}" karena judul asli sudah ada`);
              } else {
                toast.success("Survei berhasil dibuat dengan semua indikator dan pertanyaan");
              }
            }

            // Tambahkan data demografis ke database
            console.log("Adding demographic fields");
            const demographicPromises = data.demographicFields.map(async (field, index) => {
              try {
                console.log(`Adding demographic field ${index + 1}/${data.demographicFields.length}: ${field.label}`);

                const createdField = await addDemographicField({
                  survey_id: supabaseSurvey.id,
                  label: field.label,
                  type: field.type,
                  required: field.required,
                  options: field.options || [],
                  field_order: index + 1
                });

                console.log(`Demographic field created with ID: ${createdField?.id}`);
                return createdField;
              } catch (demographicError) {
                console.error(`Error adding demographic field ${index + 1}:`, demographicError);
                return null;
              }
            });

            const successfulDemographics = await Promise.all(demographicPromises);
            console.log(`Successfully added ${successfulDemographics.length}/${data.demographicFields.length} demographic fields`);

            // Navigasi ke halaman daftar survei
            console.log("Navigating to survey list page");
            router.push("/admin/manage");
          } catch (supabaseError) {
            // Tangkap error spesifik dari Supabase
            console.error("Supabase error:", supabaseError);

            // Cek apakah ini error karena judul duplikat
            if (supabaseError instanceof Error &&
                supabaseError.message &&
                supabaseError.message.toLowerCase().includes('title')) {
              toast.error(`Error: ${supabaseError.message}. Coba dengan judul survei yang berbeda.`);
            } else {
              toast.error("Gagal menyimpan survei ke database");
            }

            throw supabaseError;
          }
        } catch (createError) {
          console.error("Error creating survey:", createError);
          toast.error(createError instanceof Error ? createError.message : "Error creating survey");
        }
      }
      console.log("==== FORM SUBMISSION COMPLETED ====");
    } catch (error) {
      console.error("==== FORM SUBMISSION ERROR ====");
      console.error("Error submitting survey:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
      toast.error("Failed to save survey");
    } finally {
      console.log("Form submission process complete, setting formSubmitting to false");
      setFormSubmitting(false);
    }
  };

  // Tambahkan handler terpisah untuk memastikan submit berfungsi
  const handleManualSubmit = () => {
    console.log("Manual submit triggered");
    console.log("Current form state:", form.formState);

    // Validasi manual form
    form.trigger().then(isValid => {
      console.log("Form validation result:", isValid);

      if (isValid) {
        console.log("Form valid, attempting submit with values:", form.getValues());
        form.handleSubmit(onSubmit)();
      } else {
        console.log("Form validation failed, errors:", form.formState.errors);
        toast.error("Formulir memiliki kesalahan, silakan periksa dan coba lagi");
      }
    });
  };

  const handleAddIndicator = () => {
    appendIndicator({
      id: uuidv4(),
      title: "",
      description: "",
      questions: [
        {
          id: uuidv4(),
          text: "",
          type: "likert",
          required: true,
          weight: 50,
        },
      ],
    })

    setExpandedIndicators((prev) => ({
      ...prev,
      [indicatorFields.length]: true,
    }))
  }

  // Gunakan metode update untuk memodifikasi questions untuk indikator tertentu
  // Pendekatan ini lebih aman daripada mencoba membuat fieldArray terpisah untuk setiap indikator
  const handleAddQuestion = (indicatorIndex: number) => {
    // Dapatkan data indikator saat ini
    const currentIndicators = form.getValues("indicators");

    if (currentIndicators && currentIndicators[indicatorIndex]) {
      // Dapatkan pertanyaan yang ada dari indikator
      const currentQuestions = currentIndicators[indicatorIndex].questions || [];

      // Tambahkan pertanyaan baru
      const updatedQuestions = [
        ...currentQuestions,
        {
          id: uuidv4(),
          text: "",
          type: "likert",
          required: true,
          weight: isWeightedSurvey ? 50 : 1, // Default weight 1 (bukan undefined)
        }
      ];

      // Update indikator dengan pertanyaan yang diperbarui
      const updatedIndicator = {
        ...currentIndicators[indicatorIndex],
        questions: updatedQuestions,
      };

      // Gunakan update dari questionsFieldArray untuk memperbarui indikator
      questionsFieldArray.update(indicatorIndex, updatedIndicator);
    }
  }

  // Fungsi untuk menghapus pertanyaan dari indikator
  const handleRemoveQuestion = (indicatorIndex: number, questionIndex: number) => {
    const currentIndicators = form.getValues("indicators");

    if (currentIndicators && currentIndicators[indicatorIndex]) {
      const currentQuestions = [...currentIndicators[indicatorIndex].questions];

      // Hapus pertanyaan dari array
      currentQuestions.splice(questionIndex, 1);

      // Update indikator dengan array pertanyaan yang diperbarui
      const updatedIndicator = {
        ...currentIndicators[indicatorIndex],
        questions: currentQuestions,
      };

      // Gunakan update untuk memperbarui indikator
      questionsFieldArray.update(indicatorIndex, updatedIndicator);
    }
  }

  const handleAddDemographicField = () => {
    appendDemographic({
      id: uuidv4(),
      label: "",
      type: "text",
      required: true,
    })
  }

  const toggleIndicatorExpanded = (index: number) => {
    setExpandedIndicators((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const moveIndicatorUp = (index: number) => {
    if (index > 0) {
      moveIndicator(index, index - 1)
    }
  }

  const moveIndicatorDown = (index: number) => {
    if (index < indicatorFields.length - 1) {
      moveIndicator(index, index + 1)
    }
  }

  const handleUpdateQuestion = (indicatorIndex: number, questionIndex: number, field: keyof Question, newValue: any) => {
    const currentIndicators = form.getValues("indicators");

    if (currentIndicators && currentIndicators.length > 0) {
      // Clone current questions
      const updatedQuestions = [...currentIndicators[indicatorIndex].questions];

      // Update specific field in question
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        [field]: newValue
      };

      // Update the indicator with new questions
      const updatedIndicator = {
        ...currentIndicators[indicatorIndex],
        questions: updatedQuestions
      };

      // Update form value
      questionsFieldArray.update(indicatorIndex, updatedIndicator);
    }
  };

  return (
    <Layout>
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.push("/admin/manage")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{isEditing ? "Edit Survey" : "Create Survey"}</h1>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            console.log("Form default submit event triggered");
            handleManualSubmit();
          }}
          className="space-y-8"
        >
          <div className="grid gap-6 md:grid-cols-6">
            <div className="md:col-span-4 space-y-6">
              <div className="bg-white rounded-lg shadow-subtle p-6 border border-gray-100">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-6">
                    <TabsTrigger
                      value="details"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Info className="mr-2 h-4 w-4" />
                      Basic Details
                    </TabsTrigger>
                    <TabsTrigger
                      value="indicators"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Indicators
                    </TabsTrigger>
                    <TabsTrigger
                      value="demographics"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Demographics
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6 mt-0">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Judul Survei</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukan Judul Survei" {...field} />
                          </FormControl>
                          <FormDescription>A clear, descriptive title for your survey.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deskripsi</FormLabel>
                          <FormControl>
                            <Textarea placeholder="masukan deskripsi survei" className="min-h-[100px]" {...field} />
                          </FormControl>
                          <FormDescription>survei ini berisi tentang...</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-6">
                      <div className="border rounded-md p-4 space-y-4">
                        <h3 className="text-base font-medium">Periode Survei</h3>

                      <FormField
                        control={form.control}
                          name="period.type"
                        render={({ field }) => (
                          <FormItem>
                              <FormLabel>Tipe Periode</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select period type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="quarterly">Quarterly (Triwulan)</SelectItem>
                                  <SelectItem value="semester">Semester</SelectItem>
                                  <SelectItem value="annual">Annual (Tahunan)</SelectItem>
                              </SelectContent>
                            </Select>
                              <FormDescription>
                                The time period this survey covers
                              </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                        {form.watch('period.type') === 'quarterly' && (
                        <FormField
                          control={form.control}
                            name="period.quarter"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quarter (Triwulan)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select quarter" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                                    <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                                    <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                                    <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                                  </SelectContent>
                                </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        )}

                        {form.watch('period.type') === 'semester' && (
                        <FormField
                          control={form.control}
                            name="period.semester"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>Semester</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select semester" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1">Semester 1 (Jan-Jun)</SelectItem>
                                    <SelectItem value="2">Semester 2 (Jul-Des)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="period.year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 5 }, (_, i) => {
                                    const year = new Date().getFullYear() - 2 + i;
                                    return (
                                      <SelectItem key={year} value={year.toString()}>
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="indicators" className="space-y-6 mt-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Indikator Survei</h3>
                      <Button type="button" onClick={handleAddIndicator} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Indikator
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {indicatorFields.length === 0 ? (
                        <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg">
                          <p className="text-gray-500">
                            No indicators added yet. Click "Add Indicator" to get started.
                          </p>
                        </div>
                      ) : (
                        indicatorFields.map((indicator, indicatorIndex) => {
                          // Mendapatkan questions dari form values untuk indikator ini
                          const currentIndicator = form.getValues(`indicators.${indicatorIndex}`);
                          const questionFields = currentIndicator?.questions || [];

                          return (
                            <div
                              key={indicator.id}
                              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                            >
                              <div
                                className={cn(
                                  "bg-gray-50 border-b border-gray-200 p-4",
                                  expandedIndicators[indicatorIndex] ? "border-b" : "",
                                )}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleIndicatorExpanded(indicatorIndex)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      {expandedIndicators[indicatorIndex] ? (
                                        <ChevronUp className="h-5 w-5" />
                                      ) : (
                                        <ChevronDown className="h-5 w-5" />
                                      )}
                                    </button>
                                    <FormField
                                      control={form.control}
                                      name={`indicators.${indicatorIndex}.title`}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          placeholder="Indicator Title"
                                          className="border-0 bg-transparent font-medium w-full focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-7"
                                        />
                                      )}
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => moveIndicatorUp(indicatorIndex)}
                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        disabled={indicatorIndex === 0}
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moveIndicatorDown(indicatorIndex)}
                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        disabled={indicatorIndex === indicatorFields.length - 1}
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <Button
                                      type="button"
                                      onClick={() => removeIndicator(indicatorIndex)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {!expandedIndicators[indicatorIndex] && (
                                  <div className="mt-1 text-sm text-gray-500">
                                    {questionFields.length} pertanyaan
                                  </div>
                                )}
                              </div>

                              {expandedIndicators[indicatorIndex] && (
                                <div className="p-4 space-y-4">
                                  <FormField
                                    control={form.control}
                                    name={`indicators.${indicatorIndex}.description`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea
                                            {...field}
                                            placeholder="Indicator Description (Optional)"
                                            className="resize-none text-sm"
                                            rows={2}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <Separator />

                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                      <h4 className="text-sm font-medium">Pertanyaan</h4>
                                      <Button
                                        type="button"
                                        onClick={() => handleAddQuestion(indicatorIndex)}
                                        variant="outline"
                                        size="sm"
                                      >
                                        <Plus className="mr-2 h-3 w-3" />
                                        Tambah Pertanyaan
                                      </Button>
                                    </div>

                                    {questionFields.map((question, questionIndex) => (
                                      <div
                                        key={question.id}
                                        className="border border-gray-200 rounded-md p-4 space-y-4"
                                      >
                                        <div className="flex justify-between">
                                          <span className="text-xs font-medium text-gray-500">
                                            Pertanyaan {questionIndex + 1}
                                          </span>
                                          <Button
                                            type="button"
                                            onClick={() => handleRemoveQuestion(indicatorIndex, questionIndex)}
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>

                                        <FormField
                                          control={form.control}
                                          name={`indicators.${indicatorIndex}.questions.${questionIndex}.text`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-xs">Teks Pertanyaan</FormLabel>
                                              <FormControl>
                                                <Textarea
                                                  {...field}
                                                  placeholder="Enter question text"
                                                  className="resize-none text-sm"
                                                  rows={2}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <FormField
                                            control={form.control}
                                            name={`indicators.${indicatorIndex}.questions.${questionIndex}.type`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-xs">Tipe Pertanyaan</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger className="text-sm">
                                                      <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    {questionTypeOptions.map((option) => (
                                                      <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          {isWeightedSurvey && (
                                            <FormField
                                              control={form.control}
                                              name={`indicators.${indicatorIndex}.questions.${questionIndex}.weight`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel className="text-xs">Bobot Pertanyaan (%)</FormLabel>
                                                  <FormControl>
                                                    <Input
                                                      type="number"
                                                      min="1"
                                                      max="100"
                                                      {...field}
                                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                                      className="text-sm"
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          )}
                                        </div>

                                        <FormField
                                          control={form.control}
                                          name={`indicators.${indicatorIndex}.questions.${questionIndex}.required`}
                                          render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                                              <div className="space-y-0.5">
                                                <FormLabel className="text-xs">Required?</FormLabel>
                                                <FormDescription className="text-xs">
                                                  Responden harus mengisi pertanyaan ini
                                                </FormDescription>
                                              </div>
                                              <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />

                                        {(form.watch(`indicators.${indicatorIndex}.questions.${questionIndex}.type`) ===
                                          "dropdown" ||
                                          form.watch(`indicators.${indicatorIndex}.questions.${questionIndex}.type`) ===
                                            "radio" ||
                                          form.watch(`indicators.${indicatorIndex}.questions.${questionIndex}.type`) ===
                                            "checkbox") && (
                                          <FormField
                                            control={form.control}
                                            name={`indicators.${indicatorIndex}.questions.${questionIndex}.options`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-xs">Options (one per line)</FormLabel>
                                                <FormControl>
                                                <Textarea
  {...field}
  className="resize-none text-sm"
  rows={3}
  placeholder="Enter options (one per line)"
  value={field.value && Array.isArray(field.value) ? (field.value as string[]).join("\n") : ""}
  onChange={(e) => {
    // Gunakan trim() untuk menghapus spasi di awal dan akhir baris saja
    const options = e.target.value
      .split("\n")
      .map(line => line.trim())
      .filter(line => line !== "") // Hanya filter baris kosong
    field.onChange(options)
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const textarea = e.currentTarget
      const value = textarea.value
      const selectionStart = textarea.selectionStart
      
      // Sisipkan baris baru pada posisi kursor
      const newValue = value.slice(0, selectionStart) + "\n" + value.slice(selectionStart)
      
      // Update nilai textarea
      textarea.value = newValue
      
      // Pindahkan kursor ke baris baru
      textarea.selectionStart = selectionStart + 1
      textarea.selectionEnd = selectionStart + 1
      
      // Trigger event onChange untuk memperbarui state
      const event = new Event('input', { bubbles: true })
      textarea.dispatchEvent(event)
    }
  }}
/>
                                                </FormControl>
                                                <FormDescription className="text-xs">
                                                  Tekan Enter untuk membuat list
                                                </FormDescription>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        )}
                                      </div>
                                    ))}

                                    {questionFields.length === 0 && (
                                      <div className="text-center p-4 border border-dashed border-gray-300 rounded-md">
                                        <p className="text-gray-500 text-sm">
                                          Tidak ada pertanyaan. Klik "Tambah Pertanyaan" untuk membuat.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="demographics" className="space-y-6 mt-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Demografi Kolom</h3>
                      <Button type="button" onClick={handleAddDemographicField} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Kolom
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-md p-4">
                        <p>
                          Kolom Demografi untuk mendapatkan informasi tentang responden berfungsi untuk mengetahui segmen responden.
                        </p>
                      </div>

                      {demographicFields.map((field, index) => (
                        <div key={field.id} className="border border-gray-200 rounded-md p-4 space-y-4">
                          <div className="flex justify-between">
                            <span className="text-xs font-medium text-gray-500">Kolom Demografi {index + 1}</span>
                            <Button
                              type="button"
                              onClick={() => removeDemographic(index)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              disabled={demographicFields.length <= 1}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`demographicFields.${index}.label`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Field Label</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g. Age, Gender, etc." className="text-sm" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`demographicFields.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Field Tipe</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {questionTypeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`demographicFields.${index}.required`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-xs">Required?</FormLabel>
                                  <FormDescription className="text-xs">
                                    Responden harus mengisi
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {(form.watch(`demographicFields.${index}.type`) === "dropdown" ||
                            form.watch(`demographicFields.${index}.type`) === "radio" ||
                            form.watch(`demographicFields.${index}.type`) === "checkbox") && (
                            <FormField
                              control={form.control}
                              name={`demographicFields.${index}.options`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Opsi (one per line)</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      className="resize-none text-sm"
                                      rows={3}
                                      placeholder="Enter options (one per line)"
                                      value={field.value && Array.isArray(field.value) ? (field.value as string[]).join("\n") : ""}
                                      onChange={(e) => {
                                        const options = e.target.value
                                          .split("\n")
                                          .map(line => line.trim())
                                          .filter(Boolean)
                                        field.onChange(options)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          const cursorPosition = e.currentTarget.selectionStart
                                          const currentValue = e.currentTarget.value
                                          const newValue =
                                            currentValue.slice(0, cursorPosition) +
                                            '\n' +
                                            currentValue.slice(cursorPosition)

                                          e.currentTarget.value = newValue
                                          e.currentTarget.selectionStart = cursorPosition + 1
                                          e.currentTarget.selectionEnd = cursorPosition + 1

                                          const event = new Event('input', { bubbles: true })
                                          e.currentTarget.dispatchEvent(event)
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">Tekan Enter untuk menambah opsi</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-subtle p-6 border border-gray-100 sticky top-6">
                <h3 className="text-lg font-medium mb-6">Pengaturan Survei</h3>

                <div className="space-y-6">
                  {!isWeightedSurvey && (
                    <FormField
                      control={form.control}
                      name="surveyCategory"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Kategori Survei</FormLabel>
                          <FormDescription>
                            Pilih apakah survei ini menggunakan perhitungan IKM atau tidak
                          </FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1 mt-2"
                            >
                              <div className="flex items-center space-x-2 border rounded-md p-3">
                                <RadioGroupItem value="calculate" id="survey-calculate" />
                                <Label htmlFor="survey-calculate" className="font-medium">Calculate</Label>
                                <p className="text-xs text-gray-500 ml-6">Menggunakan perhitungan IKM</p>
                              </div>
                              <div className="flex items-center space-x-2 border rounded-md p-3">
                                <RadioGroupItem value="non_calculate" id="survey-non-calculate" />
                                <Label htmlFor="survey-non-calculate" className="font-medium">Non Calculate</Label>
                                <p className="text-xs text-gray-500 ml-6">Tanpa perhitungan IKM</p>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Activkan Survei</FormLabel>
                          <FormDescription>Make this survey available to respondents</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    className="w-full"
                    disabled={formSubmitting}
                    onClick={handleManualSubmit}
                  >
                    {formSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      "Save Survey"
                    )}
                  </Button>

                  {/* Tambahkan log status */}
                  <div className="mt-4 text-xs text-gray-500">
                    {Object.keys(form.formState.errors).length > 0 && (
                      <div className="mb-2 text-red-500">
                        Form memiliki error, silakan periksa semua tab.
                      </div>
                    )}
                    {!isWeightedSurvey && (
                      <div>Kategori: {form.watch('surveyCategory')}</div>
                    )}
                    <div>Periode: {form.watch('period.type')} - {form.watch('period.quarter') || form.watch('period.semester')} - {form.watch('period.year')}</div>
                    <div>Indikator: {form.watch('indicators').length}</div>
                    <div>Status form: {form.formState.isValid ? 'Valid' : 'Invalid'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </Layout>
  )
}

export default SurveyFormComponent
