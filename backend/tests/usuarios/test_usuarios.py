"""USU-01 a USU-04 — contrato e acesso exclusivo de superadmin."""
import uuid

import pytest
from tests.apoio import autenticar
from app.modules.usuarios.models import Usuario
from app.core.security import verificar_senha

DADOS = {"nome": "Pessoa Teste", "email": "pessoa@example.com", "senha": "Senha123!"}


def test_usu01_listagem_inclui_inativos_sem_senha(cliente, fabrica, superadmin):
    inativo = fabrica.usuario(ativo=False)
    resposta = cliente.get('/usuarios', headers=autenticar(superadmin))
    assert resposta.status_code == 200
    assert any(item['id'] == str(inativo.id) for item in resposta.json())
    assert all('senha' not in item and 'senha_hash' not in item for item in resposta.json())


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


def test_usu02_cadastro_e_login(cliente, sessao, superadmin, setor):
    resposta = cliente.post('/usuarios', json={**DADOS, 'setor_id':str(setor.id)}, headers=autenticar(superadmin))
    assert resposta.status_code == 201
    usuario = sessao.get(Usuario, uuid.UUID(resposta.json()['id']))
    assert verificar_senha(DADOS['senha'], usuario.senha_hash)
    assert cliente.post('/auth/login', json={'email':DADOS['email'], 'senha':DADOS['senha']}).status_code == 200
    duplicado = cliente.post('/usuarios', json=DADOS, headers=autenticar(superadmin))
    assert duplicado.status_code == 409
    assert duplicado.json()['campo'] == 'email'


def test_usu02_setor_inexistente_e_dados_invalidos(cliente, superadmin):
    resposta = cliente.post('/usuarios', json={**DADOS, 'setor_id':str(uuid.uuid4())}, headers=autenticar(superadmin))
    assert resposta.status_code == 409
    assert resposta.json()['campo'] == 'setor_id'
    for campo, valor in [('senha','123'),('email','invalido'),('role','outro'),('nome',' ')]:
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
