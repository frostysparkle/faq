from .backend import SemanticBackend

def main():
    backend = SemanticBackend()
    backend.build_from_dataset()

    tests = [
        "What is the Vicharanashala internship?",
        "Can I take leave during internship?",
        "How to make ROSETTA question?",
        "This is a new unknown question"
    ]

    for q in tests:
        backend.query_flow(q)

if __name__ == "__main__":
    main()