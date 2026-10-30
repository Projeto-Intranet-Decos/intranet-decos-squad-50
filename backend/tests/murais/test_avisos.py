"""Mural de avisos — docs/specs/murais.md."""

import io

from fastapi.testclient import TestClient
from PIL import Image, ImageCms

from app.modules.usuarios.models import Usuario
from tests.apoio import ArmazenamentoFalso, autenticar


def _imagem(
    largura: int, altura: int, formato: str = "PNG", modo: str = "RGB", cor="teal", **opcoes
) -> bytes:
    saida = io.BytesIO()
    Image.new(modo, (largura, altura), cor).save(saida, formato, **opcoes)
    return saida.getvalue()


def _abrir(conteudo: bytes) -> Image.Image:
    return Image.open(io.BytesIO(conteudo))


PNG = _imagem(40, 20)


def test_mur03_admin_publica_aviso_com_capa(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Nova escala", "conteudo": "Vale a partir de segunda.", "categoria": "comunicado"},
        # O tipo informado pelo cliente é ignorado: o backend grava o que corresponde à extensão.
        files={"imagem": ("capa.png", PNG, "application/octet-stream")},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 201
    aviso = resposta.json()
    assert aviso["possui_imagem"] is True
    assert aviso["setor_id"] == str(admin_setor.setor_id)
    assert aviso["autor_nome"] == admin_setor.nome
    [(chave, objeto)] = armazenamento_falso.objetos.items()
    # Guarda a versão reduzida em WebP (MUR-04), não o arquivo enviado.
    assert chave.endswith(".webp")
    assert objeto.tipo_conteudo == "image/webp"
    assert _abrir(objeto.conteudo).format == "WEBP"


def test_mur03_aviso_aparece_para_outros_colaboradores(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    criacao = cliente.post(
        "/murais/avisos",
        data={"titulo": "Nova escala", "conteudo": "Vale a partir de segunda."},
        headers=autenticar(admin_setor),
    )
    assert criacao.status_code == 201, criacao.json()

    resposta = cliente.get("/murais/avisos", headers=autenticar(comum))

    assert resposta.status_code == 200
    assert [aviso["titulo"] for aviso in resposta.json()] == ["Nova escala"]


def test_mur03_titulo_vazio_retorna_422(cliente: TestClient, admin_setor: Usuario):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "   ", "conteudo": "Texto"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "titulo"


def test_mur04_capa_de_tipo_nao_permitido_retorna_415_e_nao_cria_aviso(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Nova escala", "conteudo": "Texto"},
        files={"imagem": ("capa.gif", b"GIF89a", "image/gif")},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 415
    assert resposta.json() == {"campo": "imagem", "mensagem": "Tipo de arquivo não permitido"}
    assert cliente.get("/murais/avisos", headers=autenticar(admin_setor)).json() == []
    assert armazenamento_falso.objetos == {}


def _publicar_com_capa(cliente: TestClient, autor: Usuario, nome: str, conteudo: bytes):
    return cliente.post(
        "/murais/avisos",
        data={"titulo": "Nova escala", "conteudo": "Texto"},
        files={"imagem": (nome, conteudo, "application/octet-stream")},
        headers=autenticar(autor),
    )


def _capa_salva(armazenamento_falso: ArmazenamentoFalso) -> Image.Image:
    [objeto] = armazenamento_falso.objetos.values()
    return _abrir(objeto.conteudo)


def test_mur04_capa_grande_e_reduzida_a_1920px_no_lado_maior(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = _publicar_com_capa(cliente, admin_setor, "banner.png", _imagem(3840, 2160))

    assert resposta.status_code == 201
    assert _capa_salva(armazenamento_falso).size == (1920, 1080)


def test_mur04_capa_vertical_e_reduzida_pela_altura(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = _publicar_com_capa(cliente, admin_setor, "story.jpg", _imagem(1500, 3000, "JPEG"))

    assert resposta.status_code == 201
    assert _capa_salva(armazenamento_falso).size == (960, 1920)


def test_mur04_capa_pequena_nao_e_ampliada(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = _publicar_com_capa(cliente, admin_setor, "quadrada.webp", _imagem(800, 800, "WEBP"))

    assert resposta.status_code == 201
    assert _capa_salva(armazenamento_falso).size == (800, 800)


def test_mur04_capa_aplica_orientacao_e_descarta_metadados(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    # Foto de celular deitada: pixels 400x200, EXIF manda girar 90° (orientação 6).
    exif = Image.Exif()
    exif[0x0112] = 6
    exif[0x010F] = "Fabricante do celular"
    foto = _imagem(400, 200, "JPEG", exif=exif.tobytes())

    resposta = _publicar_com_capa(cliente, admin_setor, "foto.jpg", foto)

    assert resposta.status_code == 201
    capa = _capa_salva(armazenamento_falso)
    assert capa.size == (200, 400)
    assert len(capa.getexif()) == 0


def test_mur04_capa_mantem_perfil_de_cor_e_transparencia(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    # Meio transparente: o WebP descarta o canal alfa de imagem totalmente opaca.
    logo = _imagem(300, 300, modo="RGBA", cor=(0, 128, 128, 128), icc_profile=srgb)

    resposta = _publicar_com_capa(cliente, admin_setor, "logo.png", logo)

    assert resposta.status_code == 201
    capa = _capa_salva(armazenamento_falso)
    assert capa.mode == "RGBA"
    assert capa.info.get("icc_profile") == srgb


def test_mur04_arquivo_que_nao_e_imagem_retorna_415_e_nao_cria_aviso(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = _publicar_com_capa(cliente, admin_setor, "capa.png", b"<html>nao sou png</html>")

    assert resposta.status_code == 415
    assert resposta.json() == {"campo": "imagem", "mensagem": "Arquivo não é uma imagem válida"}
    assert cliente.get("/murais/avisos", headers=autenticar(admin_setor)).json() == []
    assert armazenamento_falso.objetos == {}


def test_mur04_imagem_acima_de_50_megapixels_retorna_413(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    # 8000x7000 = 56 MP em poucos KB: o tamanho do arquivo sozinho não barraria.
    resposta = _publicar_com_capa(cliente, admin_setor, "enorme.png", _imagem(8000, 7000, modo="1"))

    assert resposta.status_code == 413
    assert resposta.json()["campo"] == "imagem"
    assert armazenamento_falso.objetos == {}


def test_mur07_troca_de_capa_tambem_guarda_a_versao_reduzida(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    aviso = _publicar_com_capa(cliente, admin_setor, "capa.png", PNG).json()

    resposta = cliente.put(
        f"/murais/avisos/{aviso['id']}/imagem",
        files={"arquivo": ("nova.jpg", _imagem(4000, 3000, "JPEG"), "image/jpeg")},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 200
    assert _capa_salva(armazenamento_falso).size == (1920, 1440)


def test_mur09_capa_e_servida_como_webp(cliente: TestClient, admin_setor: Usuario):
    aviso = _publicar_com_capa(cliente, admin_setor, "capa.png", PNG).json()

    resposta = cliente.get(f"/murais/avisos/{aviso['id']}/imagem")

    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "image/webp"
    assert _abrir(resposta.content).format == "WEBP"


# Eventos (aviso de categoria `evento`)


def _publicar(cliente: TestClient, autor: Usuario, **campos) -> dict:
    resposta = cliente.post("/murais/avisos", data=campos, headers=autenticar(autor))
    assert resposta.status_code == 201, resposta.json()
    return resposta.json()


def test_mur01_evento_aparece_no_feed_com_datas(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    _publicar(cliente, admin_setor, titulo="Comunicado", conteudo="Texto")
    _publicar(
        cliente,
        admin_setor,
        titulo="Treinamento",
        categoria="evento",
        data_inicio="2026-10-15T14:00:00Z",
        data_fim="2026-10-15T16:00:00Z",
    )

    resposta = cliente.get("/murais/avisos", headers=autenticar(comum))

    assert resposta.status_code == 200
    por_titulo = {aviso["titulo"]: aviso for aviso in resposta.json()}
    assert por_titulo["Treinamento"]["categoria"] == "evento"
    assert por_titulo["Treinamento"]["data_inicio"] == "2026-10-15T14:00:00Z"
    assert por_titulo["Treinamento"]["data_fim"] == "2026-10-15T16:00:00Z"
    assert por_titulo["Comunicado"]["data_inicio"] is None
    assert por_titulo["Comunicado"]["data_fim"] is None


def test_mur03_evento_sem_conteudo_e_criado_com_conteudo_nulo(
    cliente: TestClient, admin_setor: Usuario
):
    aviso = _publicar(
        cliente, admin_setor, titulo="Treinamento", categoria="evento",
        conteudo="", data_inicio="2026-10-15T14:00:00Z",
    )

    assert aviso["conteudo"] is None
    assert aviso["data_fim"] is None


def test_mur03_data_sem_fuso_e_tratada_como_utc(cliente: TestClient, admin_setor: Usuario):
    aviso = _publicar(
        cliente, admin_setor, titulo="Treinamento", categoria="evento",
        data_inicio="2026-10-15T14:00:00",
    )

    assert aviso["data_inicio"] == "2026-10-15T14:00:00Z"


def test_mur03_conteudo_vazio_fora_de_evento_retorna_422(
    cliente: TestClient, admin_setor: Usuario
):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Comunicado", "conteudo": "  "},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "conteudo"


def test_mur03_categoria_convite_nao_existe_mais(cliente: TestClient, admin_setor: Usuario):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Festa", "conteudo": "Venham", "categoria": "convite"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "categoria"


def test_mur03_evento_sem_data_inicio_retorna_422(cliente: TestClient, admin_setor: Usuario):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Treinamento", "categoria": "evento"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json() == {
        "campo": "data_inicio",
        "mensagem": "Evento precisa de data de início",
    }
    assert cliente.get("/murais/avisos", headers=autenticar(admin_setor)).json() == []


def test_mur03_data_em_categoria_que_nao_e_evento_retorna_422(
    cliente: TestClient, admin_setor: Usuario
):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Comunicado", "conteudo": "Texto", "data_fim": "2026-10-15T14:00:00Z"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json() == {"campo": "data_fim", "mensagem": "Só eventos têm data"}


def test_mur03_data_fim_antes_do_inicio_retorna_422(cliente: TestClient, admin_setor: Usuario):
    resposta = cliente.post(
        "/murais/avisos",
        data={
            "titulo": "Treinamento",
            "categoria": "evento",
            "data_inicio": "2026-10-15T14:00:00Z",
            "data_fim": "2026-10-14T14:00:00Z",
        },
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json() == {
        "campo": "data_fim",
        "mensagem": "Data de fim deve ser posterior à data de início",
    }


def test_mur06_evento_que_vira_comunicado_perde_as_datas(
    cliente: TestClient, admin_setor: Usuario
):
    evento = _publicar(
        cliente, admin_setor, titulo="Treinamento", categoria="evento", conteudo="Sala 3",
        data_inicio="2026-10-15T14:00:00Z", data_fim="2026-10-15T16:00:00Z",
    )

    resposta = cliente.put(
        f"/murais/avisos/{evento['id']}",
        json={"categoria": "comunicado"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 200, resposta.json()
    assert resposta.json()["data_inicio"] is None
    assert resposta.json()["data_fim"] is None


def test_mur06_comunicado_que_vira_evento_exige_data_inicio(
    cliente: TestClient, admin_setor: Usuario
):
    aviso = _publicar(cliente, admin_setor, titulo="Comunicado", conteudo="Texto")
    url = f"/murais/avisos/{aviso['id']}"

    sem_data = cliente.put(url, json={"categoria": "evento"}, headers=autenticar(admin_setor))
    com_data = cliente.put(
        url,
        json={"categoria": "evento", "data_inicio": "2026-10-15T14:00:00Z"},
        headers=autenticar(admin_setor),
    )

    assert sem_data.status_code == 422
    assert sem_data.json()["campo"] == "data_inicio"
    assert com_data.status_code == 200, com_data.json()
    assert com_data.json()["data_inicio"] == "2026-10-15T14:00:00Z"


def test_mur06_evento_aceita_limpar_conteudo_e_data_fim(
    cliente: TestClient, admin_setor: Usuario
):
    evento = _publicar(
        cliente, admin_setor, titulo="Treinamento", categoria="evento", conteudo="Sala 3",
        data_inicio="2026-10-15T14:00:00Z", data_fim="2026-10-15T16:00:00Z",
    )

    resposta = cliente.put(
        f"/murais/avisos/{evento['id']}",
        json={"conteudo": None, "data_fim": None},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 200, resposta.json()
    assert resposta.json()["conteudo"] is None
    assert resposta.json()["data_fim"] is None


def test_mur06_evento_sem_conteudo_nao_vira_comunicado(
    cliente: TestClient, admin_setor: Usuario
):
    evento = _publicar(
        cliente, admin_setor, titulo="Treinamento", categoria="evento",
        data_inicio="2026-10-15T14:00:00Z",
    )

    resposta = cliente.put(
        f"/murais/avisos/{evento['id']}",
        json={"categoria": "comunicado"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "conteudo"


def test_mur06_nulo_em_campo_obrigatorio_retorna_422(cliente: TestClient, admin_setor: Usuario):
    aviso = _publicar(cliente, admin_setor, titulo="Comunicado", conteudo="Texto")
    url = f"/murais/avisos/{aviso['id']}"

    titulo_nulo = cliente.put(url, json={"titulo": None}, headers=autenticar(admin_setor))
    conteudo_nulo = cliente.put(url, json={"conteudo": None}, headers=autenticar(admin_setor))

    assert titulo_nulo.status_code == 422
    assert titulo_nulo.json()["campo"] == "titulo"
    assert conteudo_nulo.status_code == 422
    assert conteudo_nulo.json()["campo"] == "conteudo"
