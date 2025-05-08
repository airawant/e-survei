'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SurveyFormProps {
  onSuccess?: () => void;
}

export default function SurveyForm({ onSuccess }: SurveyFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'unweighted' as 'weighted' | 'unweighted',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: survey, error } = await supabase
        .from('surveys')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            start_date: formData.startDate ? new Date(formData.startDate).toISOString() : null,
            end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Survei berhasil dibuat');
      if (onSuccess) onSuccess();
      router.push(`/survey/${survey.id}/indicators`);
    } catch (error) {
      console.error('Error creating survey:', error);
      toast.error('Gagal membuat survei');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Judul Survei</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Masukkan judul survei"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Deskripsi Survei</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Masukkan deskripsi survei"
          />
        </div>

        <div>
          <Label htmlFor="type">Tipe Survei</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'weighted' | 'unweighted') =>
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih tipe survei" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unweighted">Survei Tanpa Bobot</SelectItem>
              <SelectItem value="weighted">Survei Dengan Bobot</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Tanggal Mulai</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="endDate">Tanggal Selesai</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Menyimpan...' : 'Buat Survei'}
      </Button>
    </form>
  );
}
