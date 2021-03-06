require 'jsduck/logger'
require 'pp'

module JsDuck

  # Deals with inheriting documentation
  class InheritDoc
    def initialize(relations)
      @relations = relations
    end

    # Performs all inheriting
    def resolve_all
      @relations.each do |cls|
        cls.all_local_members.each do |member|
          if member[:inheritdoc]
            resolve(member)
          end
        end
      end
    end

    # Copy over doc/params/return from parent member.
    def resolve(m)
      parent = find_parent(m)
      m[:doc] = (m[:doc] + "\n\n" + parent[:doc]).strip
      m[:params] = parent[:params] if parent[:params]
      m[:return] = parent[:return] if parent[:return]
    end

    # Finds parent member of the given member.  When @inheritdoc names
    # a member to inherit from, finds that member instead.
    #
    # If the parent also has @inheritdoc, continues recursively.
    def find_parent(m)
      context = m[:files][0]
      inherit = m[:inheritdoc]

      if inherit[:cls]
        parent_cls = @relations[inherit[:cls]]
        unless parent_cls
          warn("@inheritdoc #{inherit[:cls]}##{inherit[:member]} - class not found", context)
          return m
        end
        parent = parent_cls.get_members(inherit[:member], inherit[:type] || m[:tagname], inherit[:static] || m[:meta][:static])[0]
        unless parent
          warn("@inheritdoc #{inherit[:cls]}##{inherit[:member]} - member not found", context)
          return m
        end
      else
        parent_cls = @relations[m[:owner]].parent
        mixins = @relations[m[:owner]].mixins
        # Warn when no parent or mixins at all
        if !parent_cls && mixins.length == 0
          warn("@inheritdoc - parent class not found", context)
          return m
        end
        # First check for the member in all mixins, because members
        # from mixins override those from parent class.  Looking first
        # from mixins is probably a bit slower, but it's the correct
        # order to do things.
        if mixins.length > 0
          parent = mixins.map do |mix|
            mix.get_members(m[:name], m[:tagname], m[:meta][:static])[0]
          end.compact.first
        end
        # When not found, try looking from parent class
        if !parent && parent_cls
          parent = parent_cls.get_members(m[:name], m[:tagname], m[:meta][:static])[0]
        end
        # Only when both parent and mixins fail, throw warning
        if !parent
          warn("@inheritdoc - parent member not found", context)
          return m
        end
      end

      if parent[:inheritdoc]
        find_parent(parent)
      else
        parent
      end
    end

    def warn(msg, context)
      Logger.instance.warn(:inheritdoc, msg, context[:filename], context[:linenr])
    end

  end

end
