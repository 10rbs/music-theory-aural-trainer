import { Link, createFileRoute } from '@tanstack/react-router'
import { getExercise } from '../core/exercises/registry'
import { DrillRunner } from '../features/drills/DrillRunner'

export const Route = createFileRoute('/drill/$exerciseId')({
  component: DrillPage,
})

function DrillPage() {
  const { exerciseId } = Route.useParams()
  const exercise = getExercise(exerciseId)

  if (!exercise) {
    return (
      <section>
        <h2>Unknown drill</h2>
        <p className="tagline">
          No exercise named “{exerciseId}”. <Link to="/">Back home</Link>
        </p>
      </section>
    )
  }

  return <DrillRunner key={exercise.id} exercise={exercise} />
}
