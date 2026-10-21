"""USU-01 a USU-04 e USU-08 — contrato e acesso exclusivo de superadmin."""
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from tests.apoio import autenticar
from app.core.security import hash_token
from app.modules.autenticacao.models import FinalidadeToken, TokenUsoUnico
from app.modules.usuarios.models import Usuario

DADOS = {"nome": "Pessoa Teste", "email": "pessoa@example.com"}


def link_valido(cliente, token):
    return cliente.post('/auth/convite/verificar', json={'token': token}).status_code == 200


def test_usu01_listagem_inclui_inativos_sem_senha(cliente, fabrica, superadmin):
    inativo = fabrica.usuario(ativo=False)
    resposta = cliente.get('/usuarios', headers=autenticar(superadmin))
    assert resposta.status_code == 200
    assert any(item['id'] == str(inativo.id) for item in resposta.json())
    assert all('senha' not in item and 'senha_hash' not in item for item in resposta.json())


def test_usu01_indica_convite_pendente(cliente, fabrica, comum, superadmin):
    pendente = fabrica.usuario(pendente=True)
    itens = {item['id']: item for item in cliente.get('/usuarios', headers=autenticar(superadmin)).json()}
    assert itens[str(pendente.id)]['convite_pendente'] is True
    assert itens[str(comum.id)]['convite_pendente'] is False


@pytest.mark.parametrize('perfil', ['comum', 'admin_setor'])
@pytest.mark.parametrize('metodo', ['get', 'post', 'put', 'delete'])
def test_usu01_a_04_bloqueia_outros_perfis(cliente, request, comum, perfil, metodo):
    usuario = request.getfixturevalue(perfil)
    rota = '/usuarios' + (f'/{comum.id}' if metodo in ('put','delete') else '')
    argumentos = {'headers': autenticar(usuario)}
    if metodo in ('post','put'): argumentos['json'] = DADOS if metodo == 'post' else {'nome':'Alterado'}
    assert getattr(cliente, metodo)(rota, **argumentos).status_code == 403


@pytest.mark.parametrize('metodo', ['get', 'post', 'put', 'delete'])
def test_usu01_a_04_sem_token(cliente, metodo):
    rota = '/usuarios' + (f'/{uuid.uuid4()}' if metodo in ('put','delete') else '')
    assert getattr(cliente, metodo)(rota, **({'json': DADOS} if metodo in ('post','put') else {})).status_code == 401


def test_usu02_cadastro_cria_pendente_e_envia_convite(cliente, sessao, correio_falso, superadmin, setor):
    resposta = cliente.post('/usuarios', json={**DADOS, 'setor_id':str(setor.id)}, headers=autenticar(superadmin))
    assert resposta.status_code == 201
    assert resposta.json()['convite_pendente'] is True
    assert resposta.json()['email_enviado'] is True
    [email] = correio_falso.enviados
    assert email.para == DADOS['email']
    assert DADOS['nome'] in email.texto and DADOS['nome'] in email.html
    assert '/ativar-conta#token=' in email.texto and '/ativar-conta#token=' in email.html
    assert '72 horas' in email.texto
    link = sessao.query(TokenUsoUnico).filter_by(token_hash=hash_token(correio_falso.ultimo_token())).one()
    assert link.finalidade == FinalidadeToken.convite
    assert abs(link.expira_em - (datetime.now(UTC) + timedelta(hours=72))) < timedelta(minutes=1)
    assert link_valido(cliente, correio_falso.ultimo_token())


def test_usu02_falha_no_envio_mantem_o_usuario(cliente, correio_falso, superadmin):
    correio_falso.indisponivel = True
    resposta = cliente.post('/usuarios', json=DADOS, headers=autenticar(superadmin))
    assert resposta.status_code == 201
    assert resposta.json()['email_enviado'] is False
    emails = [item['email'] for item in cliente.get('/usuarios', headers=autenticar(superadmin)).json()]
    assert DADOS['email'] in emails


def test_usu02_email_duplicado_nao_cria_nem_envia(cliente, fabrica, correio_falso, superadmin):
    existentes = (
        fabrica.usuario(email='ativo@example.com'),
        fabrica.usuario(email='pendente@example.com', pendente=True),
        fabrica.usuario(email='desativado@example.com', ativo=False),
    )
    for existente in existentes:
        duplicado = cliente.post('/usuarios', json={**DADOS, 'email':existente.email}, headers=autenticar(superadmin))
        assert duplicado.status_code == 409
        assert duplicado.json()['campo'] == 'email'
    assert correio_falso.enviados == []


def test_usu02_setor_inexistente_e_dados_invalidos(cliente, superadmin):
    resposta = cliente.post('/usuarios', json={**DADOS, 'setor_id':str(uuid.uuid4())}, headers=autenticar(superadmin))
    assert resposta.status_code == 409
    assert resposta.json()['campo'] == 'setor_id'
    for campo, valor in [('email','invalido'),('role','outro'),('nome',' ')]:
        resposta = cliente.post('/usuarios', json={**DADOS, campo:valor}, headers=autenticar(superadmin))
        assert resposta.status_code == 422
        assert resposta.json()['campo'] == campo


def test_usu03_edicao_parcial_conflitos_e_nulos(cliente, fabrica, comum, superadmin, setor):
    rota = f'/usuarios/{comum.id}'
    resposta = cliente.put(rota, json={'nome':'Atualizado'}, headers=autenticar(superadmin))
    assert resposta.status_code == 200
    assert resposta.json()['email'] == comum.email
    for campo in ('nome','email','role','ativo'):
        resposta = cliente.put(rota, json={campo:None}, headers=autenticar(superadmin))
        assert resposta.status_code == 422
        assert resposta.json()['campo'] == campo
    assert cliente.put(rota, json={'setor_id':None,'data_nascimento':None}, headers=autenticar(superadmin)).status_code == 200
    outro = fabrica.usuario(email="outro@example.com")
    assert cliente.put(rota, json={'email':outro.email}, headers=autenticar(superadmin)).status_code == 409
    assert cliente.put(rota, json={'setor_id':str(uuid.uuid4())}, headers=autenticar(superadmin)).status_code == 409
    assert cliente.put(f'/usuarios/{uuid.uuid4()}', json={'nome':'X'}, headers=autenticar(superadmin)).status_code == 404


def test_usu04_desativa_preserva_e_reativa(cliente, sessao, comum, superadmin):
    rota = f'/usuarios/{comum.id}'
    resposta = cliente.delete(rota, headers=autenticar(superadmin))
    assert resposta.status_code == 200 and resposta.json()['ativo'] is False
    sessao.expire_all()
    assert sessao.get(Usuario, comum.id) is not None
    assert cliente.post('/auth/login', json={'email':comum.email, 'senha':'senha-de-teste'}).status_code == 401
    assert cliente.put(rota, json={'ativo':True}, headers=autenticar(superadmin)).json()['ativo'] is True
    assert cliente.delete(f'/usuarios/{uuid.uuid4()}', headers=autenticar(superadmin)).status_code == 404


def test_usu03_troca_de_email_invalida_os_links(cliente, fabrica, superadmin):
    pendente = fabrica.usuario(pendente=True)
    token = fabrica.link(pendente)
    assert cliente.put(f'/usuarios/{pendente.id}', json={'nome':'Outro nome'}, headers=autenticar(superadmin)).status_code == 200
    assert link_valido(cliente, token)
    assert cliente.put(f'/usuarios/{pendente.id}', json={'email':'novo@example.com'}, headers=autenticar(superadmin)).status_code == 200
    assert not link_valido(cliente, token)


def test_usu04_desativar_invalida_os_links(cliente, fabrica, superadmin):
    pendente = fabrica.usuario(pendente=True)
    token = fabrica.link(pendente)
    assert cliente.delete(f'/usuarios/{pendente.id}', headers=autenticar(superadmin)).status_code == 200
    assert cliente.put(f'/usuarios/{pendente.id}', json={'ativo':True}, headers=autenticar(superadmin)).status_code == 200
    assert not link_valido(cliente, token)


def test_usu08_reenvia_convite_e_invalida_o_anterior(cliente, fabrica, correio_falso, superadmin):
    pendente = fabrica.usuario(pendente=True)
    anterior = fabrica.link(pendente)
    resposta = cliente.post(f'/usuarios/{pendente.id}/convite', headers=autenticar(superadmin))
    assert resposta.status_code == 200
    assert resposta.json() == {'email_enviado': True}
    [email] = correio_falso.enviados
    assert email.para == pendente.email
    assert link_valido(cliente, correio_falso.ultimo_token())
    assert not link_valido(cliente, anterior)


def test_usu08_falha_no_envio_tambem_invalida_o_anterior(cliente, fabrica, correio_falso, superadmin):
    pendente = fabrica.usuario(pendente=True)
    anterior = fabrica.link(pendente)
    correio_falso.indisponivel = True
    resposta = cliente.post(f'/usuarios/{pendente.id}/convite', headers=autenticar(superadmin))
    assert resposta.status_code == 200
    assert resposta.json() == {'email_enviado': False}
    assert not link_valido(cliente, anterior)


def test_usu08_recusa_quem_ja_ativou_desativado_e_inexistente(cliente, fabrica, correio_falso, comum, superadmin):
    ja_ativou = cliente.post(f'/usuarios/{comum.id}/convite', headers=autenticar(superadmin))
    assert ja_ativou.status_code == 409
    assert ja_ativou.json() == {'mensagem': 'Usuário já ativou a conta'}
    desativado = fabrica.usuario(pendente=True, ativo=False)
    resposta = cliente.post(f'/usuarios/{desativado.id}/convite', headers=autenticar(superadmin))
    assert resposta.status_code == 409
    assert resposta.json() == {'mensagem': 'Usuário desativado'}
    assert cliente.post(f'/usuarios/{uuid.uuid4()}/convite', headers=autenticar(superadmin)).status_code == 404
    assert correio_falso.enviados == []


@pytest.mark.parametrize('perfil', ['comum', 'admin_setor'])
def test_usu08_bloqueia_outros_perfis(cliente, request, fabrica, perfil):
    pendente = fabrica.usuario(pendente=True)
    usuario = request.getfixturevalue(perfil)
    assert cliente.post(f'/usuarios/{pendente.id}/convite', headers=autenticar(usuario)).status_code == 403
    assert cliente.post(f'/usuarios/{pendente.id}/convite').status_code == 401
