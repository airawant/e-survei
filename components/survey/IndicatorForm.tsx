"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface IndicatorFormProps {
  surveyId: string;
  isWeighted: boolean;
  onSuccess?: () => void;
}

export default function IndicatorForm({ surveyId, isWeighted, onSuccess }: IndicatorFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    weight: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: indicator, error } = await supabase
        .from('indicators')
        .insert([
          {
            survey_id: surveyId,
            name: formData.name,
            description: formData.description,
            weight: isWeighted ? formData.weight : 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Indikator berhasil ditambahkan');
      if (onSuccess) onSuccess();
      router.push(`/survey/${surveyId}/questions/${indicator.id}`);
    } catch (error) {
      console.error('Error adding indicator:', error);
      toast.error('Gagal menambahkan indikator');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nama Indikator</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Masukkan nama indikator"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Deskripsi Indikator</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Masukkan deskripsi indikator"
          />
        </div>

        {isWeighted && (
          <div>
            <Label htmlFor="weight">Bobot Indikator (%)</Label>
            <Input
              id="weight"
              type="number"
              min="0"
              max="100"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
              required
            />
          </div>
        )}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Menyimpan...' : 'Tambah Indikator'}
      </Button>
    </form>
  );
}
