CUSTO_ZERO_VALUES = {
    "valor": 0,
    "diarias": "0",
    "numero_pcdp": None,
    "zimbra": None,
    "facdp": None,
    "oficio_sigadaer": None,
    "ob": None,
    "data_ob": None,
    "numero_adt_bol_publicacao": None,
}

CANCELADA_VALUES = {
    **CUSTO_ZERO_VALUES,
    "atenas_tarjada": None,
    "siloms": None,
    "matricula": None,
}

MISSION_SITUATION_VALUES = {
    "custo_zero": CUSTO_ZERO_VALUES,
    "cancelada": CANCELADA_VALUES,
}
