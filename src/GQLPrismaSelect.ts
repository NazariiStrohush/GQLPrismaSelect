import { Kind } from 'graphql/language/kinds';
import { GraphQLResolveInfo } from 'graphql/type/definition';

interface SelectInclude {
  select?: Include;
  include?: Include;
}

type Include = Record<string, boolean | SelectInclude>;

export class GQLPrismaSelect<S = any, I = any> {
  private info: GraphQLResolveInfo;

  public originalInclude?: I;
  public originalSelect?: S;
  public include?: I;
  public select?: S;
  private excludeFields: string[] = [];
  private readonly fragments: Record<string, Include>;

  constructor(
    info: GraphQLResolveInfo,
    params: { excludeFields?: string[]; get?: string | string[] } = {}
  ) {
    this.excludeFields = params.excludeFields || ['__typename'];
    this.info = info;
    // Parse and save fragments
    this.fragments = this.getFragments();
    const res = this.transformPrismaIncludeFromQuery(info);
    // Save original values
    this.originalInclude = res.include;
    this.originalSelect = res.select;
    // Get values in case we want to get a specific value by path or key
    const customSelection = this.get(params.get, res.select || res.include);
    const { include, select } = this.selectOrInclude(customSelection);
    this.include = include;
    this.select = select;
  }

  private getFragments() {
    return Object.entries(this.info.fragments).reduce<Record<string, Include>>(
      (acc, [fragmentName, fragmentData]) => {
        acc[fragmentName] = this.transformSelections(
          fragmentData.selectionSet.selections
        );
        return acc;
      },
      {}
    );
  }

  private selectOrIncludeOrBoolean(selections = {}) {
    const values = Object.values(selections);
    if (!values.length) {
      return true;
    }
    return this.selectOrInclude(selections);
  }

  private selectOrInclude(selections: object = {}) {
    const values = Object.values(selections);
    return values.some((v) => typeof v === 'boolean')
      ? { select: selections, include: undefined }
      : { include: selections, select: undefined };
  }

  private transformSelections(selections) {
    const res =
      selections?.reduce((acc, selection) => {
        // Get values
        const { name, selectionSet } = selection;
        const { value } = name;
        const { selections } = selectionSet || {};
        // Check for type
        if (selection.kind === Kind.FIELD) {
          if (this.excludeFields.includes(value)) {
            return acc || {};
          }

          acc[value] = this.selectOrIncludeOrBoolean(
            this.transformSelections(selections)
          );
        } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
          const fragmentSpreadFields = this.transformSelections(
            this.info.fragments[value].selectionSet.selections
          );
          if (fragmentSpreadFields) {
            acc = { ...acc, ...fragmentSpreadFields };
          }
        }
        return acc;
      }, {}) || {};
    return res;
  }

  private transformPrismaIncludeFromQuery(info: GraphQLResolveInfo) {
    const mapped = this.transformSelections(
      info?.fieldNodes[0]?.selectionSet?.selections
    );

    const res = this.selectOrInclude(mapped);
    return res;
  }

  private get(_path?: string | string[], _obj?: any) {
    if (!_path?.length) {
      return _obj;
    }
    let path = _path;
    if (typeof _path === 'string') {
      path = _path.split('.');
    }
    const [key, ...rest] = path;
    const obj = _obj[key];
    return this.get(rest, obj.select || obj.include);
  }
}
