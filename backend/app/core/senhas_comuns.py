"""Senhas recusadas na política de senha (USU-09), comparadas em minúsculas.

As de 8+ caracteres mais comuns nos vazamentos públicos, mais as óbvias em português e do
contexto do hospital. Só entram senhas com 8 ou mais caracteres: as menores o tamanho mínimo já
barra.
"""

SENHAS_COMUNS: frozenset[str] = frozenset(
    {
        # Sequências e teclado
        "12345678", "123456789", "1234567890", "0123456789", "87654321", "11111111",
        "00000000", "12341234", "12121212", "11223344", "112233445566", "123123123",
        "123321123", "147258369", "159753456", "1q2w3e4r", "1q2w3e4r5t", "1qaz2wsx",
        "qwertyui", "qwerty123", "qwerty1234", "qwertyuiop", "asdfghjk", "asdfghjkl",
        "zxcvbnm1", "abcd1234", "abc12345", "abcdefgh", "a1b2c3d4", "aa123456",
        "q1w2e3r4", "zaq12wsx", "!qaz2wsx", "1234qwer", "qweasdzxc",
        # Inglês
        "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd",
        "iloveyou", "sunshine", "princess", "football", "baseball", "superman",
        "trustno1", "welcome1", "welcome123", "letmein1", "changeme", "computer",
        "internet", "starwars", "whatever", "michelle", "jennifer", "corvette",
        "mercedes", "dragon123", "monkey123", "master123", "admin123", "admin1234",
        "administrator", "qwerty12", "test1234", "testtest",
        # Português
        "senha123", "senha1234", "senha12345", "minhasenha", "mudar123", "trocar123",
        "brasil123", "brasil2026", "flamengo", "corinthians", "palmeiras", "vasco123",
        "gremio123", "saopaulo", "botafogo", "fluminense", "cruzeiro", "santos123",
        "jesus123", "deusefiel", "deus1234", "amor1234", "teamo123", "familia1",
        "familia123", "felicidade", "estrela1", "beatriz1", "gabriela", "fernanda",
        "mariana1", "juliana1", "123mudar", "mudar@123", "senha@123", "trocar@123",
        # Contexto
        "hospital", "hospital1", "hospital123", "hospital@123", "decos123", "decos2026",
        "intranet", "intranet1", "intranet123", "enfermagem", "enfermeira", "medicina",
        "saude123", "paciente", "plantao123", "colaborador",
    }
)


def senha_comum(senha: str) -> bool:
    """Lista acima ou um caractere só repetido (`aaaaaaaa`)."""
    return senha.lower() in SENHAS_COMUNS or len(set(senha)) == 1
