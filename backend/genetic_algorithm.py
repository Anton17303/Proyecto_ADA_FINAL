"""
Algoritmo Genético para optimización de rutas (TSP).

Terminología:
  - Cromosoma / individuo : permutación de índices de destinos
  - Gen                   : índice de un destino
  - Fitness               : distancia total (se minimiza)
  - Élite                 : los mejores individuos que pasan directamente
  - Cruce OX1             : Order Crossover, conserva sub-secuencias
  - Mutación swap         : intercambia dos genes al azar
"""

import random


# ──────────────────────────────────────────────
# Funciones auxiliares
# ──────────────────────────────────────────────

def route_distance(route, matrix, closed: bool) -> int:
    """Distancia total de una ruta dada la matriz de distancias."""
    total = sum(matrix[route[i]][route[i + 1]] for i in range(len(route) - 1))
    if closed:
        total += matrix[route[-1]][route[0]]
    return total


def initial_population(n: int, size: int) -> list:
    """Genera una población inicial de permutaciones aleatorias."""
    base = list(range(n))
    pop = []
    for _ in range(size):
        ind = base.copy()
        random.shuffle(ind)
        pop.append(ind)
    return pop


# ──────────────────────────────────────────────
# Operadores genéticos
# ──────────────────────────────────────────────

def tournament_select(population: list, scores: list, k: int = 3) -> list:
    """Selección por torneo: elige el mejor entre k candidatos aleatorios."""
    contenders = random.sample(range(len(population)), k)
    winner = min(contenders, key=lambda i: scores[i])
    return population[winner].copy()


def ox1_crossover(p1: list, p2: list) -> list:
    """
    Order Crossover (OX1): copia un segmento de p1 y rellena con el orden de p2.
    Garantiza que el hijo sea una permutación válida.
    """
    n = len(p1)
    a, b = sorted(random.sample(range(n), 2))
    child = [-1] * n
    child[a: b + 1] = p1[a: b + 1]
    segment_set = set(child[a: b + 1])
    fill = [gene for gene in p2 if gene not in segment_set]
    ptr = 0
    for i in range(n):
        if child[i] == -1:
            child[i] = fill[ptr]
            ptr += 1
    return child


def swap_mutate(individual: list, rate: float = 0.02) -> list:
    """Mutación por intercambio: cada gen tiene `rate` de probabilidad de swappear."""
    ind = individual.copy()
    n = len(ind)
    for i in range(n):
        if random.random() < rate:
            j = random.randint(0, n - 1)
            ind[i], ind[j] = ind[j], ind[i]
    return ind


# ──────────────────────────────────────────────
# Motor principal
# ──────────────────────────────────────────────

def run(
    distance_matrix: list,
    closed: bool = True,
    population_size: int = 120,
    generations: int = 600,
    mutation_rate: float = 0.02,
    elite_size: int = 12,
    patience: int = 120,          # parada anticipada si no mejora
) -> tuple:
    """
    Ejecuta el algoritmo genético.

    Parámetros:
        distance_matrix : matriz NxN de distancias en metros
        closed          : True → ruta cerrada (regresa al origen)
        population_size : número de individuos por generación
        generations     : máximo de generaciones
        mutation_rate   : probabilidad de mutación por gen
        elite_size      : individuos que pasan intactos a la siguiente gen
        patience        : generaciones sin mejora antes de parar

    Retorna:
        (mejor_ruta: list[int], mejor_distancia: int)
    """
    n = len(distance_matrix)

    # Caso trivial
    if n <= 2:
        route = list(range(n))
        return route, route_distance(route, distance_matrix, closed)

    population = initial_population(n, population_size)
    best_route = None
    best_dist = float("inf")
    stagnant = 0

    for _ in range(generations):
        scores = [route_distance(ind, distance_matrix, closed) for ind in population]

        # Actualizar mejor global
        gen_best_idx = min(range(len(scores)), key=lambda i: scores[i])
        if scores[gen_best_idx] < best_dist:
            best_dist = scores[gen_best_idx]
            best_route = population[gen_best_idx].copy()
            stagnant = 0
        else:
            stagnant += 1

        if stagnant >= patience:
            break  # parada anticipada

        # Élite
        ranked = sorted(zip(scores, population), key=lambda x: x[0])
        next_gen = [ind.copy() for _, ind in ranked[:elite_size]]

        # Cruce + mutación para completar la población
        while len(next_gen) < population_size:
            p1 = tournament_select(population, scores)
            p2 = tournament_select(population, scores)
            child = ox1_crossover(p1, p2)
            child = swap_mutate(child, mutation_rate)
            next_gen.append(child)

        population = next_gen

    return best_route, best_dist
