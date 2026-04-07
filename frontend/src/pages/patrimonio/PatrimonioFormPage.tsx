import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { usePermissao } from '../../hooks/usePermissao'
import { fornecedoresService } from '../../services/fornecedores.service'
import { patrimonioService } from '../../services/patrimonio.service'
import { responsaveisService } from '../../services/responsaveis.service'
import { secretariasService } from '../../services/secretarias.service'
import {
  EstadoConservacao,
  Perfil,
  StatusItem,
  TipoEntrada,
} from '../../types/enums'
import type { PatrimonioFormValues } from '../../types/patrimonio.types'
import { normalizeTomboInput } from '../../utils/validators'

const DIRECT_STATUS_OPTIONS = [
  StatusItem.ATIVO,
  StatusItem.INATIVO,
  StatusItem.EM_MANUTENCAO,
]

interface PatrimonioFormState
  extends Omit<PatrimonioFormValues, 'dataAquisicao'> {
  dataAquisicao?: Dayjs | null
}

export function PatrimonioFormPage() {
  const [form] = Form.useForm<PatrimonioFormState>()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const watchedSecretariaId = Form.useWatch('secretariaAtualId', form)

  const secretariasQuery = useQuery({
    queryKey: ['secretarias-options'],
    queryFn: secretariasService.findOptions,
  })

  const responsaveisQuery = useQuery({
    queryKey: ['responsaveis-options'],
    queryFn: responsaveisService.findOptions,
  })

  const fornecedoresQuery = useQuery({
    queryKey: ['fornecedores-options'],
    queryFn: fornecedoresService.findOptions,
  })

  const patrimonioQuery = useQuery({
    queryKey: ['patrimonio-detail', id],
    queryFn: () => patrimonioService.findOne(id as string),
    enabled: isEditing,
  })

  const mutation = useMutation({
    mutationFn: (values: PatrimonioFormState) => {
      const payload: PatrimonioFormValues = {
        item: values.item,
        tombo: values.tombo,
        secretariaAtualId: values.secretariaAtualId,
        localizacaoAtual: values.localizacaoAtual,
        responsavelAtualId: values.responsavelAtualId,
        estadoConservacao: values.estadoConservacao,
        status: values.status,
        fornecedorId: values.fornecedorId || null,
        tipoEntrada: values.tipoEntrada,
        valorOriginal: values.valorOriginal,
        valorAtual: values.valorAtual ?? null,
        descricao: values.descricao || null,
        dataAquisicao: values.dataAquisicao
          ? values.dataAquisicao.format('YYYY-MM-DD')
          : null,
        observacoes: values.observacoes || null,
      }

      return isEditing
        ? patrimonioService.update(id as string, payload)
        : patrimonioService.create(payload)
    },
    onSuccess: async () => {
      message.success(
        isEditing
          ? 'Patrimonio atualizado com sucesso.'
          : 'Patrimonio criado com sucesso.',
      )
      await queryClient.invalidateQueries({ queryKey: ['patrimonios-list'] })
      navigate('/patrimonios', { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel salvar o patrimonio.')
    },
  })

  const secretariasOptions = useMemo(() => {
    const options = [...(secretariasQuery.data ?? [])]

    if (
      patrimonioQuery.data?.secretariaAtual &&
      !options.some((item) => item.id === patrimonioQuery.data.secretariaAtual.id)
    ) {
      options.push(patrimonioQuery.data.secretariaAtual)
    }

    return options
  }, [patrimonioQuery.data?.secretariaAtual, secretariasQuery.data])

  const responsaveisOptions = useMemo(() => {
    const options = [...(responsaveisQuery.data ?? [])]

    if (
      patrimonioQuery.data?.responsavelAtual &&
      !options.some((item) => item.id === patrimonioQuery.data.responsavelAtual.id)
    ) {
      options.push(patrimonioQuery.data.responsavelAtual)
    }

    return options
  }, [patrimonioQuery.data?.responsavelAtual, responsaveisQuery.data])

  const fornecedoresOptions = useMemo(() => {
    const options = [...(fornecedoresQuery.data ?? [])]

    if (
      patrimonioQuery.data?.fornecedor &&
      !options.some((item) => item.id === patrimonioQuery.data.fornecedor?.id)
    ) {
      options.push(patrimonioQuery.data.fornecedor)
    }

    return options
  }, [fornecedoresQuery.data, patrimonioQuery.data?.fornecedor])

  const filteredResponsaveisOptions = useMemo(
    () =>
      responsaveisOptions.filter(
        (responsavel) =>
          !watchedSecretariaId || responsavel.secretariaId === watchedSecretariaId,
      ),
    [responsaveisOptions, watchedSecretariaId],
  )

  useEffect(() => {
    const currentResponsavelId = form.getFieldValue('responsavelAtualId')

    if (
      currentResponsavelId &&
      !filteredResponsaveisOptions.some(
        (responsavel) => responsavel.id === currentResponsavelId,
      )
    ) {
      form.setFieldValue('responsavelAtualId', undefined)
    }
  }, [filteredResponsaveisOptions, form])

  useEffect(() => {
    if (patrimonioQuery.data) {
      form.setFieldsValue({
        item: patrimonioQuery.data.item,
        tombo: patrimonioQuery.data.tombo,
        secretariaAtualId: patrimonioQuery.data.secretariaAtualId,
        localizacaoAtual: patrimonioQuery.data.localizacaoAtual,
        responsavelAtualId: patrimonioQuery.data.responsavelAtualId,
        estadoConservacao: patrimonioQuery.data.estadoConservacao,
        status: patrimonioQuery.data.status,
        fornecedorId: patrimonioQuery.data.fornecedorId,
        tipoEntrada: patrimonioQuery.data.tipoEntrada,
        valorOriginal: Number(patrimonioQuery.data.valorOriginal),
        valorAtual: patrimonioQuery.data.valorAtual
          ? Number(patrimonioQuery.data.valorAtual)
          : null,
        descricao: patrimonioQuery.data.descricao,
        dataAquisicao: patrimonioQuery.data.dataAquisicao
          ? dayjs(patrimonioQuery.data.dataAquisicao)
          : null,
        observacoes: patrimonioQuery.data.observacoes,
      })
    }
  }, [form, patrimonioQuery.data])

  if (!hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label={isEditing ? 'Editar patrimonio' : 'Novo patrimonio'}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={isEditing ? 'Editar patrimonio' : 'Cadastrar patrimonio'}
          description="Este modulo cobre o cadastro patrimonial inicial da Fase 1, sem antecipar movimentacao ou baixa."
        />

        <Card
          loading={
            patrimonioQuery.isLoading ||
            secretariasQuery.isLoading ||
            responsaveisQuery.isLoading ||
            fornecedoresQuery.isLoading
          }
        >
          <Form<PatrimonioFormState>
            form={form}
            layout="vertical"
            initialValues={{
              estadoConservacao: EstadoConservacao.BOM,
              status: StatusItem.ATIVO,
              tipoEntrada: TipoEntrada.COMPRA,
            }}
            onFinish={(values) => {
              void mutation.mutateAsync(values)
            }}
          >
            <Form.Item
              label="Item"
              name="item"
              rules={[
                { required: true, message: 'Informe o item.' },
                { min: 3, message: 'O item deve ter ao menos 3 caracteres.' },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="Tombo"
              name="tombo"
              rules={[
                { required: true, message: 'Informe o tombo.' },
                {
                  pattern: /^\d{5}$/,
                  message: 'O tombo deve conter exatamente 5 digitos.',
                },
              ]}
              extra="O tombo e tratado como texto para preservar zeros a esquerda."
            >
              <Input
                size="large"
                maxLength={5}
                onChange={(event) => {
                  form.setFieldValue(
                    'tombo',
                    normalizeTomboInput(event.target.value),
                  )
                }}
              />
            </Form.Item>

            <Form.Item
              label="Secretaria atual"
              name="secretariaAtualId"
              rules={[{ required: true, message: 'Selecione a secretaria.' }]}
            >
              <Select
                size="large"
                options={secretariasOptions.map((secretaria) => ({
                  label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                  value: secretaria.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Responsavel atual"
              name="responsavelAtualId"
              rules={[{ required: true, message: 'Selecione o responsavel.' }]}
            >
              <Select
                size="large"
                options={filteredResponsaveisOptions.map((responsavel) => ({
                  label: `${responsavel.nome} - ${responsavel.setor}`,
                  value: responsavel.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Localizacao atual"
              name="localizacaoAtual"
              rules={[
                { required: true, message: 'Informe a localizacao atual.' },
                {
                  min: 2,
                  message: 'A localizacao atual deve ter ao menos 2 caracteres.',
                },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="Estado de conservacao"
              name="estadoConservacao"
              rules={[
                {
                  required: true,
                  message: 'Selecione o estado de conservacao.',
                },
              ]}
            >
              <Select
                size="large"
                options={Object.values(EstadoConservacao).map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Selecione o status.' }]}
            >
              <Select
                size="large"
                options={DIRECT_STATUS_OPTIONS.map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Tipo de entrada"
              name="tipoEntrada"
              rules={[
                { required: true, message: 'Selecione o tipo de entrada.' },
              ]}
            >
              <Select
                size="large"
                options={Object.values(TipoEntrada).map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </Form.Item>

            <Form.Item label="Fornecedor" name="fornecedorId">
              <Select
                allowClear
                size="large"
                options={fornecedoresOptions.map((fornecedor) => ({
                  label: fornecedor.cpfCnpj
                    ? `${fornecedor.nome} - ${fornecedor.cpfCnpj}`
                    : fornecedor.nome,
                  value: fornecedor.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Valor original"
              name="valorOriginal"
              rules={[
                { required: true, message: 'Informe o valor original.' },
              ]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Valor atual" name="valorAtual">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>

            <div style={{ color: 'rgba(0, 0, 0, 0.45)', marginTop: -12 }}>
              Se o valor atual ficar em branco, o detalhe do patrimonio pode
              gerar uma estimativa inicial com base na data de aquisicao e no
              estado de conservacao.
            </div>

            <Form.Item label="Data de aquisicao" name="dataAquisicao">
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Descricao" name="descricao">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Form.Item label="Observacoes" name="observacoes">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                {isEditing ? 'Salvar alteracoes' : 'Criar patrimonio'}
              </Button>
              <Button onClick={() => navigate('/patrimonios')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
